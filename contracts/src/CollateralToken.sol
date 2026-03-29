// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RaylsErc1155Handler} from "rayls-protocol-sdk/tokens/RaylsErc1155Handler.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {ICollateralRegistry} from "./ICollateralRegistry.sol";

/// @title CollateralToken
/// @notice ERC1155 that tokenizes defaulted loan collaterals into fractions.
///         Each collateralId from CollateralRegistry becomes a tokenId in this ERC1155.
///         The uri() only exposes "BankName-collateralId" — no sensitive data leaks to public chain.
/// @dev Inherits RaylsErc1155Handler for cross-chain bridging:
///   - teleportToPublicChain(to, id, amount, chainId, data) — lock on private, mint on public
///   - mint(to, id, amount, data)                            — mint new tokens (onlyOwner)
contract CollateralToken is RaylsErc1155Handler {
    using Strings for uint256;

    // ── State ───────────────────────────────────────────────────────────

    ICollateralRegistry public registry;
    string public bankName;

    struct TokenizedCollateral {
        uint256 collateralId;
        uint256 maxTokenCount;
        uint256 pricePerToken;   // totalValue / maxTokenCount (in wei)
        uint256 totalValue;      // loanAmount + accrued interest
        uint256 yieldBasisPoints; // yield from registry (e.g. 800 = 8%)
        bool tokenized;
    }

    mapping(uint256 => TokenizedCollateral) public tokenizedCollaterals;
    uint256[] public tokenizedIds;

    // ── Events ──────────────────────────────────────────────────────────

    event Tokenized(
        uint256 indexed collateralId,
        uint256 maxTokenCount,
        uint256 pricePerToken,
        uint256 totalValue,
        uint256 yieldBasisPoints
    );

    // ── Constructor ─────────────────────────────────────────────────────

    /// @param _bankName         Bank identifier shown on public chain (e.g. "PhilixBank")
    /// @param _registry         Address of the deployed CollateralRegistry
    /// @param _endpoint         EndpointV1 (from DeploymentProxyRegistry: "Endpoint")
    /// @param _rnEndpoint       RNEndpointV1 (from DeploymentProxyRegistry: "RNEndpoint")
    /// @param _userGovernance   RNUserGovernanceV1 (from DeploymentProxyRegistry: "RNUserGovernance")
    constructor(
        string memory _bankName,
        address _registry,
        address _endpoint,
        address _rnEndpoint,
        address _userGovernance
    )
        RaylsErc1155Handler(
            "",          // uri set dynamically via override
            _bankName,
            _endpoint,
            _rnEndpoint,
            _userGovernance,
            msg.sender,  // owner = deployer
            false         // isCustom = false
        )
    {
        bankName = _bankName;
        registry = ICollateralRegistry(_registry);
    }

    // ── Core ────────────────────────────────────────────────────────────

    /// @notice Tokenize a defaulted collateral into ERC1155 fractions.
    ///         Yield is read from the CollateralRegistry (set during registration).
    /// @param collateralId  ID in CollateralRegistry
    /// @param maxTokenCount Number of fractions to create
    function tokenize(
        uint256 collateralId,
        uint256 maxTokenCount
    ) external onlyOwner {
        require(maxTokenCount > 0, "Max count must be > 0");
        require(!tokenizedCollaterals[collateralId].tokenized, "Already tokenized");

        ICollateralRegistry.Collateral memory c = registry.getCollateral(collateralId);
        require(c.active, "Collateral not active");

        // totalValue = loanAmount + (loanAmount * interest * timeDays) / (10000 * 365)
        uint256 accruedInterest = (c.loanAmount * c.interest * c.timeDays) / (10000 * 365);
        uint256 totalValue = c.loanAmount + accruedInterest;
        uint256 pricePerToken = totalValue / maxTokenCount;

        require(pricePerToken > 0, "Price per token must be > 0");

        tokenizedCollaterals[collateralId] = TokenizedCollateral({
            collateralId: collateralId,
            maxTokenCount: maxTokenCount,
            pricePerToken: pricePerToken,
            totalValue: totalValue,
            yieldBasisPoints: c.yield_,
            tokenized: true
        });
        tokenizedIds.push(collateralId);

        // Mint fractions to bank (contract owner).
        // Uses _mint (internal) to avoid cross-chain notification before resourceId is assigned.
        _mint(msg.sender, collateralId, maxTokenCount, "");

        emit Tokenized(collateralId, maxTokenCount, pricePerToken, totalValue, c.yield_);
    }

    // ── Views ───────────────────────────────────────────────────────────

    /// @notice Returns sanitized URI: "BankName-collateralId". No sensitive data.
    function uri(uint256 id) public view override returns (string memory) {
        return string.concat(bankName, "-", id.toString());
    }

    /// @notice Get tokenization info for a collateral.
    function getTokenizedCollateral(uint256 collateralId)
        external
        view
        returns (TokenizedCollateral memory)
    {
        return tokenizedCollaterals[collateralId];
    }

    /// @notice Get all tokenized collateral IDs.
    function getTokenizedIds() external view returns (uint256[] memory) {
        return tokenizedIds;
    }
}
