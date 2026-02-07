//SDPX -License-Identifier: MIT
pragma solidity ^0.8.28;

contract Ilon {

    struct CrowdFunding {
        address owner;
        string title;
        string description;
        uint goal;
        uint pledged;
        uint startAt;
        uint endAt;
        bool claimed;
    }


}

