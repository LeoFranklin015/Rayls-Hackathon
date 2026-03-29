import { ethers } from 'hardhat'
import { EntryPoint__factory, SimpleAccountFactory__factory, SimpleAccount__factory } from '../typechain'

async function main() {
  const provider = ethers.provider
  const signer = provider.getSigner()
  const signerAddr = await signer.getAddress()

  const EP = '0x7c15F90346FeaF7CF68b4199711532CF04976F0b'
  const FACTORY = '0x9be621875A115b2348Ec0AC771fBDA7A839e2765'

  const entryPoint = EntryPoint__factory.connect(EP, signer)
  const factory = SimpleAccountFactory__factory.connect(FACTORY, signer)

  console.log('=== EntryPoint Full AA Test ===')
  console.log('Signer:', signerAddr)
  console.log('EntryPoint:', EP)
  console.log('Factory:', FACTORY)

  // 1. Get the counterfactual address for our smart account (salt=0)
  const salt = 0
  const accountAddr = await factory.getAddress(signerAddr, salt)
  console.log('\n--- Step 1: Counterfactual Account Address ---')
  console.log('Smart Account (not yet deployed):', accountAddr)

  // Check if account already exists
  const code = await provider.getCode(accountAddr)
  console.log('Account has code:', code !== '0x')

  // 2. Build initCode (factory address + createAccount calldata)
  const initCode = code !== '0x'
    ? '0x'
    : ethers.utils.hexConcat([
        FACTORY,
        factory.interface.encodeFunctionData('createAccount', [signerAddr, salt])
      ])
  console.log('\n--- Step 2: InitCode ---')
  console.log('initCode length:', initCode.length)

  // 3. Fund the smart account on the EntryPoint so it can pay for gas
  console.log('\n--- Step 3: Fund smart account deposit ---')
  const depositTx = await entryPoint.depositTo(accountAddr, { value: ethers.utils.parseEther('0.05') })
  await depositTx.wait()
  const balance = await entryPoint.balanceOf(accountAddr)
  console.log('Smart account deposit:', ethers.utils.formatEther(balance), 'USDR')

  // 4. Build the UserOperation
  console.log('\n--- Step 4: Build UserOperation ---')
  const nonce = await entryPoint.getNonce(accountAddr, 0)
  console.log('Nonce:', nonce.toString())

  // callData: execute a simple call (send 0 value to self, empty data — a no-op)
  const accountIface = SimpleAccount__factory.createInterface()
  const callData = accountIface.encodeFunctionData('execute', [signerAddr, 0, '0x'])

  // Pack gas limits: verificationGasLimit (high 128 bits) | callGasLimit (low 128 bits)
  const verificationGasLimit = ethers.BigNumber.from(500000)
  const callGasLimit = ethers.BigNumber.from(200000)
  const accountGasLimits = ethers.utils.hexConcat([
    ethers.utils.hexZeroPad(verificationGasLimit.toHexString(), 16),
    ethers.utils.hexZeroPad(callGasLimit.toHexString(), 16)
  ])

  // Pack gas fees: maxPriorityFeePerGas (high 128 bits) | maxFeePerGas (low 128 bits)
  const maxFeePerGas = ethers.BigNumber.from(48000000001)
  const maxPriorityFeePerGas = ethers.BigNumber.from(1000000000)
  const gasFees = ethers.utils.hexConcat([
    ethers.utils.hexZeroPad(maxPriorityFeePerGas.toHexString(), 16),
    ethers.utils.hexZeroPad(maxFeePerGas.toHexString(), 16)
  ])

  const userOp = {
    sender: accountAddr,
    nonce: nonce,
    initCode: initCode,
    callData: callData,
    accountGasLimits: accountGasLimits,
    preVerificationGas: 100000,
    gasFees: gasFees,
    paymasterAndData: '0x',
    signature: '0x'
  }

  // 5. Get userOpHash and sign it
  console.log('\n--- Step 5: Sign UserOperation ---')
  const userOpHash = await entryPoint.getUserOpHash(userOp)
  console.log('UserOp Hash:', userOpHash)

  // SimpleAccount uses ECDSA.recover(userOpHash, sig) — raw digest, no prefix
  const signingKey = new ethers.utils.SigningKey(process.env.PRIVATE_KEY!)
  const sig = signingKey.signDigest(userOpHash)
  const signature = ethers.utils.joinSignature(sig)
  userOp.signature = signature
  console.log('Signature:', signature.slice(0, 20) + '...')

  // 6. Simulate via eth_call (static call to handleOps)
  console.log('\n--- Step 6: Simulate handleOps via eth_call ---')
  try {
    await entryPoint.callStatic.handleOps([userOp], signerAddr)
    console.log('SUCCESS: handleOps simulation passed!')
  } catch (e: any) {
    console.log('Simulation reverted:', e.reason || e.message)
    // This is expected in some cases — let's try the real tx
  }

  // 7. Actually send the UserOp on-chain
  console.log('\n--- Step 7: Execute handleOps on-chain ---')
  try {
    const tx = await entryPoint.handleOps([userOp], signerAddr, { gasLimit: 1000000 })
    const receipt = await tx.wait()
    console.log('SUCCESS! Tx hash:', receipt.transactionHash)
    console.log('Gas used:', receipt.gasUsed.toString())
    console.log('Events:')
    for (const log of receipt.logs) {
      try {
        const parsed = entryPoint.interface.parseLog(log)
        console.log(`  - ${parsed.name}:`, JSON.stringify(parsed.args.map((a: any) => a.toString())))
      } catch {}
    }
  } catch (e: any) {
    console.log('handleOps failed:', e.reason || e.message)
  }

  // 8. Verify final state
  console.log('\n--- Step 8: Verify Final State ---')
  const finalCode = await provider.getCode(accountAddr)
  console.log('Smart account deployed:', finalCode !== '0x')
  const finalNonce = await entryPoint.getNonce(accountAddr, 0)
  console.log('Nonce after execution:', finalNonce.toString())
  const finalDeposit = await entryPoint.balanceOf(accountAddr)
  console.log('Remaining deposit:', ethers.utils.formatEther(finalDeposit), 'USDR')
}

main().catch(e => { console.error(e); process.exit(1) })
