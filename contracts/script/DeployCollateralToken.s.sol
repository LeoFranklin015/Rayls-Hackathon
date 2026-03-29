// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CollateralToken} from "../src/CollateralToken.sol";
import {IDeploymentProxyRegistryV1} from "rayls-protocol-sdk/interfaces/IDeploymentProxyRegistryV1.sol";

/// @title DeployCollateralToken
/// @notice Deploys CollateralToken (ERC1155) to the Privacy Node.
///
/// Usage:
///   source .env
///   forge script script/DeployCollateralToken.s.sol --rpc-url $PRIVACY_NODE_RPC_URL --broadcast --legacy
contract DeployCollateralToken is Script {
    function run() external {
        address registryAddr = vm.envAddress("DEPLOYMENT_PROXY_REGISTRY");
        address collateralRegistry = vm.envAddress("COLLATERAL_REGISTRY_ADDRESS");
        string memory bankName = vm.envString("BANK_NAME");
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        IDeploymentProxyRegistryV1 registry = IDeploymentProxyRegistryV1(registryAddr);

        address endpoint = registry.getContract("Endpoint");
        address rnEndpoint = registry.getContract("RNEndpoint");
        address userGovernance = registry.getContract("RNUserGovernance");

        require(endpoint != address(0), "Endpoint not found in registry");
        require(rnEndpoint != address(0), "RNEndpoint not found in registry");
        require(userGovernance != address(0), "RNUserGovernance not found in registry");

        console.log("=== Infrastructure Addresses ===");
        console.log("  Endpoint:           ", endpoint);
        console.log("  RNEndpoint:         ", rnEndpoint);
        console.log("  RNUserGovernance:   ", userGovernance);
        console.log("  CollateralRegistry: ", collateralRegistry);

        vm.startBroadcast(deployerKey);

        CollateralToken token = new CollateralToken(
            bankName,
            collateralRegistry,
            endpoint,
            rnEndpoint,
            userGovernance
        );

        vm.stopBroadcast();

        console.log("");
        console.log("=== Deployed ===");
        console.log("  CollateralToken:", address(token));
        console.log("");
        console.log("Next step: Set COLLATERAL_TOKEN_ADDRESS=%s in your .env", vm.toString(address(token)));
    }
}
