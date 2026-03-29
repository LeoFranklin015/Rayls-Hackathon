// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {Marketplace} from "../src/Marketplace.sol";

/// @title ListCollateralFractions
/// @notice Lists collateral ERC1155 fractions on the Marketplace (public chain).
///         Bank must approve the Marketplace for the ERC1155 first.
///
/// Usage:
///   source .env
///   forge script script/ListCollateralFractions.s.sol --rpc-url $PUBLIC_CHAIN_RPC_URL --broadcast --legacy
contract ListCollateralFractions is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address marketplaceAddr = vm.envAddress("MARKETPLACE_ADDRESS");
        address tokenAddr = vm.envAddress("PUBLIC_COLLATERAL_TOKEN_ADDRESS");
        uint256 collateralId = vm.envUint("LIST_COLLATERAL_ID");
        uint256 amount = vm.envUint("LIST_AMOUNT");
        uint256 pricePerToken = vm.envUint("LIST_PRICE_PER_TOKEN");

        Marketplace marketplace = Marketplace(payable(marketplaceAddr));
        IERC1155 token = IERC1155(tokenAddr);

        vm.startBroadcast(deployerKey);

        // Approve marketplace to transfer ERC1155
        token.setApprovalForAll(marketplaceAddr, true);

        // List fractions (price = price per fraction for ERC1155)
        uint256 listingId = marketplace.list(
            tokenAddr,
            Marketplace.AssetType.ERC1155,
            collateralId,
            amount,
            pricePerToken
        );

        vm.stopBroadcast();

        console.log("=== Fractions Listed ===");
        console.log("  Listing ID:      ", listingId);
        console.log("  Token:           ", tokenAddr);
        console.log("  Collateral ID:   ", collateralId);
        console.log("  Amount:          ", amount);
        console.log("  Price Per Token: ", pricePerToken);
    }
}
