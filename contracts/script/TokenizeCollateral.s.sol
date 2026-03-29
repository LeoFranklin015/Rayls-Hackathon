// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CollateralToken} from "../src/CollateralToken.sol";

/// @title TokenizeCollateral
/// @notice Tokenizes a defaulted loan collateral into ERC1155 fractions.
///         Yield is read from CollateralRegistry (set during registration).
///
/// Usage:
///   source .env
///   forge script script/TokenizeCollateral.s.sol --rpc-url $PRIVACY_NODE_RPC_URL --broadcast --legacy
contract TokenizeCollateral is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address tokenAddr = vm.envAddress("COLLATERAL_TOKEN_ADDRESS");
        uint256 collateralId = vm.envUint("TOKENIZE_COLLATERAL_ID");
        uint256 maxTokenCount = vm.envUint("TOKENIZE_MAX_TOKEN_COUNT");

        CollateralToken token = CollateralToken(tokenAddr);

        vm.startBroadcast(deployerKey);
        token.tokenize(collateralId, maxTokenCount);
        vm.stopBroadcast();

        console.log("=== Collateral Tokenized ===");
        console.log("  Collateral ID:   ", collateralId);
        console.log("  Max Token Count: ", maxTokenCount);
    }
}
