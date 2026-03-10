// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title VeChainAgent (VA)
 * @dev VIP-180 compatible token on VeChainThor.
 *      VIP-180 is a superset of ERC-20, so inheriting OpenZeppelin's
 *      ERC20 gives us full compatibility.
 *
 *      Initial supply of 1,000,000 VA is minted to the deployer.
 */
contract VeChainAgent is ERC20 {
    constructor() ERC20("VeChainAgent", "VA") {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }
}
