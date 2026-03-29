// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {RedemptionVault} from "../src/RedemptionVault.sol";

/// @title DeployRedemptionVault
/// @notice Deploys the RedemptionVault on the public chain.
///
/// Usage:
///   source .env
///   forge script script/DeployRedemptionVault.s.sol --rpc-url $PUBLIC_CHAIN_RPC_URL --broadcast --legacy
contract DeployRedemptionVault is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address bank = vm.envAddress("PUBLIC_CHAIN_BANK_ADDRESS");
        address collateralToken = vm.envAddress("PUBLIC_COLLATERAL_TOKEN_ADDRESS");
        address marketplace = vm.envAddress("MARKETPLACE_ADDRESS");

        vm.startBroadcast(deployerKey);
        RedemptionVault vault = new RedemptionVault(bank, collateralToken, marketplace);
        vm.stopBroadcast();

        console.log("=== Deployed to Public Chain ===");
        console.log("  RedemptionVault:", address(vault));
        console.log("");
        console.log("Add to your .env:");
        console.log("  REDEMPTION_VAULT_ADDRESS=%s", vm.toString(address(vault)));
        console.log("");
        console.log("Next: Call Marketplace.setRedemptionVault(%s)", vm.toString(address(vault)));
    }
}
