//SDPX-License Identifier: MIT
pragma solidity ^0.8.28;

interface tokenInterface {
    function mint(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}