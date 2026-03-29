// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title RedemptionVault
/// @notice Tracks ERC1155 collateral fraction holders on the public chain.
///         When the bank fills a collateral, it batch-transfers USDR (principal + yield)
///         to all holders proportionally and deactivates that collateral from further buys.
contract RedemptionVault is ReentrancyGuard {

    // ── State ───────────────────────────────────────────────────────────

    address public bank;
    IERC1155 public collateralToken;     // mirror ERC1155 on public chain
    address public marketplace;           // authorized caller for registerPurchase

    /// @notice Tracks total fractions sold per collateral
    mapping(uint256 => uint256) public fractionsSold;

    /// @notice Tracks each holder's fraction count per collateral
    mapping(uint256 => mapping(address => uint256)) public holdings;

    /// @notice List of holders per collateral (for iteration)
    mapping(uint256 => address[]) internal _holderList;
    mapping(uint256 => mapping(address => bool)) internal _isHolder;

    /// @notice Whether a collateral has been filled (no more buys allowed)
    mapping(uint256 => bool) public filled;

    /// @notice Pending withdrawals for holders whose transfer failed during fill
    mapping(address => uint256) public pendingWithdrawals;

    // ── Events ──────────────────────────────────────────────────────────

    event PurchaseRegistered(uint256 indexed collateralId, address indexed buyer, uint256 amount);
    event CollateralFilled(uint256 indexed collateralId, uint256 totalPaid, uint256 holderCount);
    event YieldPaid(uint256 indexed collateralId, address indexed holder, uint256 amount, uint256 payout);
    event TransferFailed(uint256 indexed collateralId, address indexed holder, uint256 payout);

    // ── Modifiers ───────────────────────────────────────────────────────

    modifier onlyBank() {
        require(msg.sender == bank, "Only bank");
        _;
    }

    modifier onlyMarketplace() {
        require(msg.sender == marketplace, "Only marketplace");
        _;
    }

    // ── Constructor ─────────────────────────────────────────────────────

    /// @param _bank             Bank's public chain address
    /// @param _collateralToken  Mirror ERC1155 contract on public chain
    /// @param _marketplace      Marketplace contract authorized to register purchases
    constructor(address _bank, address _collateralToken, address _marketplace) {
        require(_bank != address(0), "Invalid bank");
        require(_collateralToken != address(0), "Invalid token");
        require(_marketplace != address(0), "Invalid marketplace");
        bank = _bank;
        collateralToken = IERC1155(_collateralToken);
        marketplace = _marketplace;
    }

    // ── Purchase Tracking ───────────────────────────────────────────────

    /// @notice Called by Marketplace when someone buys ERC1155 fractions.
    function registerPurchase(
        uint256 collateralId,
        address buyer,
        uint256 amount
    ) external onlyMarketplace {
        require(amount > 0, "Amount must be > 0");
        require(!filled[collateralId], "Collateral already filled");

        holdings[collateralId][buyer] += amount;
        fractionsSold[collateralId] += amount;

        if (!_isHolder[collateralId][buyer]) {
            _isHolder[collateralId][buyer] = true;
            _holderList[collateralId].push(buyer);
        }

        emit PurchaseRegistered(collateralId, buyer, amount);
    }

    // ── Fill (Batch Transfer to All Holders) ────────────────────────────

    /// @notice Bank fills a collateral — batch-transfers USDR to all holders
    ///         based on their holding count. Pays principal + yield per fraction.
    ///         After fill, this collateral is marked as done (no more buys).
    /// @param collateralId   The collateral being filled
    /// @param pricePerToken  Original price per fraction (in wei)
    /// @param yieldBasisPoints Yield in basis points (e.g. 800 = 8%)
    function fillCollateral(
        uint256 collateralId,
        uint256 pricePerToken,
        uint256 yieldBasisPoints
    ) external payable onlyBank nonReentrant {
        require(!filled[collateralId], "Already filled");

        uint256 sold = fractionsSold[collateralId];
        require(sold > 0, "No fractions sold");

        // payout per fraction = pricePerToken * (10000 + yield) / 10000
        uint256 payoutPerFraction = (pricePerToken * (10000 + yieldBasisPoints)) / 10000;
        uint256 totalRequired = sold * payoutPerFraction;
        require(msg.value >= totalRequired, "Insufficient USDR deposit");

        filled[collateralId] = true;

        // Batch transfer to all holders — if a transfer fails, record it
        // as a pending withdrawal so it doesn't block other holders.
        uint256 totalPaid;
        address[] storage holders = _holderList[collateralId];
        for (uint256 i; i < holders.length; i++) {
            address holder = holders[i];
            uint256 holderAmount = holdings[collateralId][holder];
            if (holderAmount == 0) continue;

            uint256 payout = holderAmount * payoutPerFraction;
            totalPaid += payout;

            // Clear holding
            holdings[collateralId][holder] = 0;

            // Send USDR — if it fails, record as pending withdrawal
            (bool sent,) = holder.call{value: payout}("");
            if (sent) {
                emit YieldPaid(collateralId, holder, holderAmount, payout);
            } else {
                pendingWithdrawals[holder] += payout;
                emit TransferFailed(collateralId, holder, payout);
            }
        }

        // Refund excess USDR to bank
        uint256 excess = msg.value - totalPaid;
        if (excess > 0) {
            (bool refunded,) = bank.call{value: excess}("");
            require(refunded, "Refund failed");
        }

        emit CollateralFilled(collateralId, totalPaid, holders.length);
    }

    // ── Withdraw (Pull Pattern for Failed Transfers) ─────────────────

    /// @notice Holders whose fill transfer failed can withdraw their pending USDR.
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        pendingWithdrawals[msg.sender] = 0;

        (bool sent,) = msg.sender.call{value: amount}("");
        require(sent, "Withdraw failed");
    }

    // ── Views ───────────────────────────────────────────────────────────

    /// @notice Get all holders for a collateral
    function getHolders(uint256 collateralId) external view returns (address[] memory) {
        return _holderList[collateralId];
    }

    /// @notice Get holder count for a collateral
    function getHolderCount(uint256 collateralId) external view returns (uint256) {
        return _holderList[collateralId].length;
    }

    /// @notice Check if a collateral has been filled
    function isFilled(uint256 collateralId) external view returns (bool) {
        return filled[collateralId];
    }

    // ── Receiver Callbacks ──────────────────────────────────────────────

    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    receive() external payable {}
}
