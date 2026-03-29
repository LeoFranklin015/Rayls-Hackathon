// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { Script, console2 } from "forge-std/Script.sol";
import { CodeConstants } from "./HelperConfig.s.sol";

contract DeployP256Verifier is CodeConstants, Script {
    address constant NICK_CREATE2_FACTORY = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    bytes32 constant SALT = 0x0000000000000000000000000000000000000000135c0bd4331643038756500f;
    address constant EXPECTED_ADDRESS = 0x000000000000D01eA45F9eFD5c54f037Fa57Ea1a;

    function run() external {
        console2.log("Deploying P256 Verifier on chain ID", block.chainid);

        // Check if already deployed
        if (EXPECTED_ADDRESS.code.length > 0) {
            console2.log("P256 Verifier already deployed at", EXPECTED_ADDRESS);
            return;
        }

        bytes memory initcode = P256_VERIFIER_BYTECODE;
        bytes memory payload = abi.encodePacked(SALT, initcode);

        vm.startBroadcast();
        (bool success,) = NICK_CREATE2_FACTORY.call(payload);
        vm.stopBroadcast();

        require(success, "CREATE2 deploy failed");

        require(EXPECTED_ADDRESS.code.length > 0, "P256 Verifier not at expected address");
        console2.log("P256 Verifier deployed at", EXPECTED_ADDRESS);
    }
}
