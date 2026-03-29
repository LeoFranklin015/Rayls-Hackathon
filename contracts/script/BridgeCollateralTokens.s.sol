// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CollateralToken} from "../src/CollateralToken.sol";

/// @title BridgeCollateralTokens
/// @notice Bridges ERC1155 collateral fractions from Privacy Node to Public Chain.
///
///         IMPORTANT: Must be signed with REGISTERED_PRIVATE_KEY.
///
/// Usage:
///   source .env
///   forge script script/BridgeCollateralTokens.s.sol --rpc-url $PRIVACY_NODE_RPC_URL --broadcast --legacy
contract BridgeCollateralTokens is Script {
    function run() external {
        uint256 registeredKey = vm.envUint("REGISTERED_PRIVATE_KEY");
        address tokenAddr = vm.envAddress("COLLATERAL_TOKEN_ADDRESS");
        address to = vm.envAddress("TRANSFER_TO");
        uint256 collateralId = vm.envUint("BRIDGE_COLLATERAL_ID");
        uint256 amount = vm.envUint("BRIDGE_AMOUNT");
        uint256 publicChainId = vm.envUint("PUBLIC_CHAIN_ID");

        CollateralToken token = CollateralToken(tokenAddr);

        vm.startBroadcast(registeredKey);
        bool success = token.teleportToPublicChain(to, collateralId, amount, publicChainId, "");
        vm.stopBroadcast();

        require(success, "teleportToPublicChain failed");

        console.log("=== Collateral Tokens Bridged ===");
        console.log("  Token:         ", tokenAddr);
        console.log("  Collateral ID: ", collateralId);
        console.log("  Amount:        ", amount);
        console.log("  To:            ", to);
        console.log("  Chain ID:      ", publicChainId);
    }
}
