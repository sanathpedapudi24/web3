// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockStablecoin is ERC20, Ownable {
    constructor() ERC20("MockUSDC", "mUSDC") Ownable() {
        _mint(msg.sender, 1000000 * 10**6); // 1M tokens for testing
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}