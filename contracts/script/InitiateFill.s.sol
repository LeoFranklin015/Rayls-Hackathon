// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {RedemptionVault} from "../src/RedemptionVault.sol";

/// @title InitiateFill
/// @notice Bank fills a collateral — batch-transfers USDR to all fraction holders.
///
/// Usage:
///   source .env
///   forge script script/InitiateFill.s.sol --rpc-url $PUBLIC_CHAIN_RPC_URL --broadcast --legacy
contract InitiateFill is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address vaultAddr = vm.envAddress("REDEMPTION_VAULT_ADDRESS");
        uint256 collateralId = vm.envUint("FILL_COLLATERAL_ID");
        uint256 pricePerToken = vm.envUint("FILL_PRICE_PER_TOKEN");
        uint256 yieldBasisPoints = vm.envUint("FILL_YIELD_BASIS_POINTS");
        uint256 depositAmount = vm.envUint("FILL_DEPOSIT_AMOUNT");

        RedemptionVault vault = RedemptionVault(payable(vaultAddr));

        vm.startBroadcast(deployerKey);
        vault.fillCollateral{value: depositAmount}(
            collateralId,
            pricePerToken,
            yieldBasisPoints
        );
        vm.stopBroadcast();

        console.log("=== Collateral Filled ===");
        console.log("  Collateral ID: ", collateralId);
        console.log("  Deposit:       ", depositAmount);
        console.log("  Yield (bps):   ", yieldBasisPoints);
    }
}
