//SDPX-License Identifier: MIT
pragma solidity ^0.8.28;

interface tokenInterface {
    function mint(address to, uint256 amount) external; 
    function burn(address from, uint256 amount) external;
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}