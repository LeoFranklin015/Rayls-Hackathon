// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CollateralRegistry
/// @notice Stores collateral information for loans — asset type, terms, and owner.
contract CollateralRegistry is Ownable {

    enum CollateralType { Land, House, Vehicle }

    struct Collateral {
        bytes32 ownerId;          // owner identifier (hex)
        uint256 loanAmount;       // loan amount in wei
        uint256 timeDays;         // loan duration in days
        uint256 startTimestamp;   // loan start date (unix timestamp)
        uint256 interest;         // interest rate in basis points (e.g. 500 = 5%)
        uint256 yield_;           // yield offered to investors in basis points (e.g. 800 = 8%)
        CollateralType colType;   // Land, House, or Vehicle
        string info;              // free-text description of the collateral item
        bool active;
    }

    uint256 public nextId;
    mapping(uint256 => Collateral) public collaterals;

    event CollateralAdded(uint256 indexed id, bytes32 indexed ownerId, CollateralType colType, uint256 loanAmount);
    event CollateralUpdated(uint256 indexed id);
    event CollateralRemoved(uint256 indexed id);

    constructor() Ownable(msg.sender) {}

    // ── Write ───────────────────────────────────────────────────────────

    /// @notice Register a new collateral entry
    function addCollateral(
        bytes32 ownerId,
        uint256 loanAmount,
        uint256 timeDays,
        uint256 startTimestamp,
        uint256 interest,
        uint256 yield_,
        CollateralType colType,
        string calldata info
    ) external onlyOwner returns (uint256 id) {
        require(loanAmount > 0, "Loan amount must be > 0");
        require(timeDays > 0, "Duration must be > 0");

        id = nextId++;
        collaterals[id] = Collateral({
            ownerId: ownerId,
            loanAmount: loanAmount,
            timeDays: timeDays,
            startTimestamp: startTimestamp,
            interest: interest,
            yield_: yield_,
            colType: colType,
            info: info,
            active: true
        });

        emit CollateralAdded(id, ownerId, colType, loanAmount);
    }

    /// @notice Update an existing collateral entry
    function updateCollateral(
        uint256 id,
        uint256 loanAmount,
        uint256 timeDays,
        uint256 startTimestamp,
        uint256 interest,
        uint256 yield_,
        CollateralType colType,
        string calldata info
    ) external onlyOwner {
        require(collaterals[id].active, "Not active");
        require(loanAmount > 0, "Loan amount must be > 0");
        require(timeDays > 0, "Duration must be > 0");

        Collateral storage c = collaterals[id];
        c.loanAmount = loanAmount;
        c.timeDays = timeDays;
        c.startTimestamp = startTimestamp;
        c.interest = interest;
        c.yield_ = yield_;
        c.colType = colType;
        c.info = info;

        emit CollateralUpdated(id);
    }

    /// @notice Deactivate a collateral entry
    function removeCollateral(uint256 id) external onlyOwner {
        require(collaterals[id].active, "Not active");
        collaterals[id].active = false;
        emit CollateralRemoved(id);
    }

    // ── Read ────────────────────────────────────────────────────────────

    /// @notice Get a single collateral entry
    function getCollateral(uint256 id) external view returns (Collateral memory) {
        return collaterals[id];
    }

    /// @notice Get all active collateral IDs
    function getActiveCollaterals() external view returns (uint256[] memory) {
        uint256 count;
        for (uint256 i; i < nextId; i++) {
            if (collaterals[i].active) count++;
        }
        uint256[] memory result = new uint256[](count);
        uint256 idx;
        for (uint256 i; i < nextId; i++) {
            if (collaterals[i].active) result[idx++] = i;
        }
        return result;
    }

    /// @notice Get all collateral IDs belonging to a specific owner
    function getCollateralsByOwner(bytes32 ownerId) external view returns (uint256[] memory) {
        uint256 count;
        for (uint256 i; i < nextId; i++) {
            if (collaterals[i].ownerId == ownerId && collaterals[i].active) count++;
        }
        uint256[] memory result = new uint256[](count);
        uint256 idx;
        for (uint256 i; i < nextId; i++) {
            if (collaterals[i].ownerId == ownerId && collaterals[i].active) result[idx++] = i;
        }
        return result;
    }
}
