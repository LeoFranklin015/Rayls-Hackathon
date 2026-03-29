// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

interface IRedemptionVault {
    function registerPurchase(uint256 collateralId, address buyer, uint256 amount) external;
    function isFilled(uint256 collateralId) external view returns (bool);
}

/// @title Marketplace
/// @notice Escrow marketplace for bridged assets on the public chain.
///         Each team deploys their own instance. Owner lists tokens, anyone can buy.
///         Tokens are held in escrow until purchased or delisted.
///         Supports ERC20, ERC721, and ERC1155 (with fractional/partial buys).
contract Marketplace is Ownable {

    enum AssetType { ERC20, ERC721, ERC1155 }

    struct Listing {
        address token;
        AssetType assetType;
        uint256 tokenId;    // ERC721/ERC1155 token ID (0 for ERC20)
        uint256 amount;     // ERC20 amount / ERC1155 remaining fractions (1 for ERC721)
        uint256 price;      // Price in USDR per unit (per token for ERC1155, total for ERC20/ERC721)
        bool active;
    }

    uint256 public nextListingId;
    mapping(uint256 => Listing) public listings;

    address public redemptionVault;

    event Listed(uint256 indexed listingId, address indexed token, AssetType assetType, uint256 price);
    event Updated(uint256 indexed listingId, uint256 newPrice);
    event Delisted(uint256 indexed listingId);
    event Bought(uint256 indexed listingId, address indexed buyer, uint256 price);
    event BoughtFraction(uint256 indexed listingId, address indexed buyer, uint256 amount, uint256 totalPrice);

    constructor() Ownable(msg.sender) {}

    // ── Config ─────────────────────────────────────────────────────────

    /// @notice Set the RedemptionVault address for ERC1155 purchase tracking.
    function setRedemptionVault(address _vault) external onlyOwner {
        redemptionVault = _vault;
    }

    // ── Owner CRUD ──────────────────────────────────────────────────────

    /// @notice List tokens for sale. Transfers tokens from owner into escrow.
    ///         Owner must approve this contract first.
    /// @param token Mirror token contract on the public chain
    /// @param assetType ERC20, ERC721, or ERC1155
    /// @param tokenId Token ID (ERC721/ERC1155 only, use 0 for ERC20)
    /// @param amount Amount (ERC20 amount / ERC1155 fraction count, use 1 for ERC721)
    /// @param price Price in USDR — total price for ERC20/ERC721, price-per-fraction for ERC1155
    function list(
        address token,
        AssetType assetType,
        uint256 tokenId,
        uint256 amount,
        uint256 price
    ) external onlyOwner returns (uint256 listingId) {
        require(price > 0, "Price must be > 0");

        if (assetType == AssetType.ERC20) {
            require(amount > 0, "Amount must be > 0");
            IERC20(token).transferFrom(msg.sender, address(this), amount);
        } else if (assetType == AssetType.ERC721) {
            IERC721(token).transferFrom(msg.sender, address(this), tokenId);
            amount = 1;
        } else {
            require(amount > 0, "Amount must be > 0");
            IERC1155(token).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        }

        listingId = nextListingId++;
        listings[listingId] = Listing({
            token: token,
            assetType: assetType,
            tokenId: tokenId,
            amount: amount,
            price: price,
            active: true
        });

        emit Listed(listingId, token, assetType, price);
    }

    /// @notice Update the price of an active listing
    function update(uint256 listingId, uint256 newPrice) external onlyOwner {
        require(listings[listingId].active, "Not active");
        require(newPrice > 0, "Price must be > 0");
        listings[listingId].price = newPrice;
        emit Updated(listingId, newPrice);
    }

    /// @notice Remove a listing and return tokens to owner
    function delist(uint256 listingId) external onlyOwner {
        Listing storage l = listings[listingId];
        require(l.active, "Not active");
        l.active = false;

        if (l.assetType == AssetType.ERC20) {
            IERC20(l.token).transfer(owner(), l.amount);
        } else if (l.assetType == AssetType.ERC721) {
            IERC721(l.token).transferFrom(address(this), owner(), l.tokenId);
        } else {
            IERC1155(l.token).safeTransferFrom(address(this), owner(), l.tokenId, l.amount, "");
        }

        emit Delisted(listingId);
    }

    // ── Public ──────────────────────────────────────────────────────────

    /// @notice Buy a listed ERC20 or ERC721 asset. Send USDR >= price.
    function buy(uint256 listingId) external payable {
        Listing storage l = listings[listingId];
        require(l.active, "Not active");
        require(l.assetType != AssetType.ERC1155, "Use buyFraction for ERC1155");
        require(msg.value >= l.price, "Insufficient payment");

        l.active = false;

        if (l.assetType == AssetType.ERC20) {
            IERC20(l.token).transfer(msg.sender, l.amount);
        } else {
            IERC721(l.token).safeTransferFrom(address(this), msg.sender, l.tokenId);
        }

        (bool sent,) = owner().call{value: msg.value}("");
        require(sent, "USDR transfer failed");

        emit Bought(listingId, msg.sender, msg.value);
    }

    /// @notice Buy ERC1155 fractions from a listing. Supports partial buys.
    /// @param listingId The listing to buy from
    /// @param amount Number of fractions to buy
    function buyFraction(uint256 listingId, uint256 amount) external payable {
        Listing storage l = listings[listingId];
        require(l.active, "Not active");
        require(l.assetType == AssetType.ERC1155, "Not an ERC1155 listing");
        require(amount > 0 && amount <= l.amount, "Invalid amount");
        require(redemptionVault != address(0), "Vault not set");
        require(!IRedemptionVault(redemptionVault).isFilled(l.tokenId), "Collateral filled");

        uint256 totalCost = l.price * amount;
        require(msg.value >= totalCost, "Insufficient payment");

        l.amount -= amount;
        if (l.amount == 0) {
            l.active = false;
        }

        IERC1155(l.token).safeTransferFrom(address(this), msg.sender, l.tokenId, amount, "");

        // Register purchase with RedemptionVault for yield tracking
        IRedemptionVault(redemptionVault).registerPurchase(l.tokenId, msg.sender, amount);

        // Send only totalCost to owner, refund excess to buyer
        (bool sent,) = owner().call{value: totalCost}("");
        require(sent, "USDR transfer failed");

        uint256 excess = msg.value - totalCost;
        if (excess > 0) {
            (bool refunded,) = msg.sender.call{value: excess}("");
            require(refunded, "Refund failed");
        }

        emit BoughtFraction(listingId, msg.sender, amount, totalCost);
    }

    // ── Views ───────────────────────────────────────────────────────────

    /// @notice Get a listing by ID
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    /// @notice Get all active listing IDs
    function getActiveListings() external view returns (uint256[] memory) {
        uint256 count;
        for (uint256 i; i < nextListingId; i++) {
            if (listings[i].active) count++;
        }
        uint256[] memory result = new uint256[](count);
        uint256 idx;
        for (uint256 i; i < nextListingId; i++) {
            if (listings[i].active) result[idx++] = i;
        }
        return result;
    }

    // ── Receiver Callbacks ──────────────────────────────────────────────

    /// @notice Allow contract to receive ERC721 via safeTransferFrom
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    /// @notice Allow contract to receive ERC1155 via safeTransferFrom
    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    /// @notice Allow contract to receive ERC1155 batch via safeBatchTransferFrom
    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}
