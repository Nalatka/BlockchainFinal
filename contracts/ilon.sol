//SDPX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "contracts/interface/tokenInterface.sol";

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

    tokenInterface public token;

    mapping(uint => CrowdFunding) public crowdFundings;
    uint public crowdFundingCount;

    constructor(address _token) {
        token = tokenInterface(_token);
    }

    function createCrowdFunding (
        string memory _title,
        string memory _description,
        uint _goal,
        uint _startAt,
        uint _endAt
    ) external {
        require(_startAt >= block.timestamp, "Start time should be in the future");
        require(_endAt > _startAt, "End time should be after start time");

        crowdFundingCount += 1;

        crowdFundings[crowdFundingCount] = CrowdFunding(
            msg.sender,
            _title,
            _description,
            _goal,
            0,
            _startAt,
            _endAt,
            false
        );
    }
    
    mapping(uint => mapping(address => uint)) public pledgedAmount;

    function contribute(uint _id, uint _amount) external {
        CrowdFunding storage crowdFunding = crowdFundings[_id];

        require(block.timestamp >= crowdFunding.startAt, "Crowd funding hasn't started yet");
        require(block.timestamp <= crowdFunding.endAt, "Crowd funding has ended");

        crowdFunding.pledged += _amount;
        pledgedAmount[_id][msg.sender] += _amount;

        token.mint(msg.sender, _amount);
    }   
    

}

