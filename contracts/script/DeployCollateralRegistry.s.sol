// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CollateralRegistry} from "../src/CollateralRegistry.sol";

/// @title DeployCollateralRegistry
/// @notice Deploys CollateralRegistry to the Privacy Node.
///
/// Usage:
///   source .env
///   forge script script/DeployCollateralRegistry.s.sol --rpc-url $PRIVACY_NODE_RPC_URL --broadcast --legacy
contract DeployCollateralRegistry is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        CollateralRegistry registry = new CollateralRegistry();

        vm.stopBroadcast();

        console.log("=== Deployed ===");
        console.log("  CollateralRegistry:", address(registry));
        console.log("");
        console.log("Next step: Set COLLATERAL_REGISTRY_ADDRESS=%s in your .env", vm.toString(address(registry)));
    }
}
