// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MoonQueue is ERC20, Ownable {

    uint256 public constant TOKENS_PER_ENTRY = 1 * 10 ** 18;
    uint256 public constant QUEUE_PRICE = 0.001 ether;

    uint256 public totalParticipants;

    event JoinedQueue(address indexed user, uint256 tokensMinted);

    constructor() ERC20("MoonQueue", "MQ") Ownable(msg.sender) {
    }

    function joinQueue() external payable {
        require(msg.value == QUEUE_PRICE, "Incorrect ETH amount");

        _mint(msg.sender, TOKENS_PER_ENTRY);
        totalParticipants++;

        emit JoinedQueue(msg.sender, TOKENS_PER_ENTRY);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
