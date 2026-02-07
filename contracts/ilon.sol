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

    function contribute(uint _id) payable public {
        CrowdFunding storage crowdFunding = crowdFundings[_id];

        require(block.timestamp >= crowdFunding.startAt, "Crowd funding hasn't started yet");
        require(block.timestamp <= crowdFunding.endAt, "Crowd funding has ended");
        require(msg.value > 0, "Contribution should be greater than 0");

        crowdFunding.pledged += msg.value;
        pledgedAmount[_id][msg.sender] += msg.value;

        token.mint(msg.sender, msg.value);
    }   
    function claim(uint _id) public {
        CrowdFunding storage crowdFunding = crowdFundings[_id];

        require(msg.sender == crowdFunding.owner, "Only owner can claim");
        require(block.timestamp > crowdFunding.endAt, "Crowd funding hasn't ended yet");
        require(crowdFunding.pledged >= crowdFunding.goal, "Crowd funding goal not reached");
        require(!crowdFunding.claimed, "Already claimed");

        crowdFunding.claimed = true;

        payable(crowdFunding.owner).transfer(crowdFunding.pledged);
    }


}

