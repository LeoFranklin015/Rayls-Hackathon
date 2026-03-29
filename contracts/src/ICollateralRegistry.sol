// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ICollateralRegistry
/// @notice Interface for reading collateral data from the CollateralRegistry contract.
interface ICollateralRegistry {
    enum CollateralType { Land, House, Vehicle }

    struct Collateral {
        bytes32 ownerId;
        uint256 loanAmount;
        uint256 timeDays;
        uint256 startTimestamp;
        uint256 interest;
        uint256 yield_;
        CollateralType colType;
        string info;
        bool active;
    }

    function getCollateral(uint256 id) external view returns (Collateral memory);
    function getActiveCollaterals() external view returns (uint256[] memory);
    function getCollateralsByOwner(bytes32 ownerId) external view returns (uint256[] memory);
}
