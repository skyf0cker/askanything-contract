// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract askanything is Initializable {
    address owner;
    mapping(address => string) public pks;
    mapping(address => uint256[]) personQuestionIdxs;
    mapping(bytes32 => uint256) questionIdx;
    mapping(bytes32 => bool) questionExist;
    questionInfo[] public qs;
    uint256 public questionNum;

    uint256 earnedRewards;

    struct questionInfo {
        bytes32 qid;
        address person;
        string question;
        uint256 reward;
        uint256 expirationSec;
        string answer;
        bool canceled;
    }

    event askQuestionEvent(bytes32 qid, address person, uint256 expirationSec);
    event answerQuestionEvent(bytes32 qid);
    event withdrawEvent(uint256 amount);
    event cancelQuestionEvent(bytes32 qid);

    function initialize() public initializer {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "must be contract owner");
        _;
    }

    function isEmptyString(string memory s) internal pure returns (bool) {
        return bytes(s).length == 0;
    }

    function isExpired(uint256 time) internal view returns (bool) {
        return time < block.timestamp;
    }

    function askQuestion(
        string calldata q,
        string calldata pk,
        uint256 expirationSec
    ) public payable {
        if (isEmptyString(q)) {
            revert("empty question is not allowed");
        }

        if (!isEmptyString(pk)) {
            pks[msg.sender] = pk;
        }

        if (isExpired(expirationSec)) {
            revert("invalid expiration second");
        }

        uint256 l = qs.length;
        bytes32 qid = keccak256(bytes(q));
        questionIdx[qid] = l;
        questionExist[qid] = true;
        qs.push(
            questionInfo(
                qid,
                msg.sender,
                q,
                msg.value,
                expirationSec,
                "",
                false
            )
        );
        questionNum++;
        personQuestionIdxs[msg.sender].push(l);
        emit askQuestionEvent(qid, msg.sender, expirationSec);
    }

    function answerQuestion(bytes32 qid, string calldata answer)
        public
        onlyOwner
    {
        if (!questionExist[qid]) {
            revert("question not exist");
        }

        uint256 qIdx = questionIdx[qid];
        qs[qIdx].answer = answer;
        if (isExpired(qs[qIdx].expirationSec)) {
            revert("question has been expired");
        }

        earnedRewards += qs[qIdx].reward;
        emit answerQuestionEvent(qid);
    }

    function getMyQuestions() public view returns (questionInfo[] memory) {
        uint256[] memory qIdxs = personQuestionIdxs[msg.sender];
        questionInfo[] memory result = new questionInfo[](qIdxs.length);
        for (uint256 i = 0; i < qIdxs.length; i++) {
            result[i] = qs[i];
        }

        return result;
    }

    function getEarnedRewards() public view onlyOwner returns (uint256) {
        return earnedRewards;
    }

    function cancelQuestion(bytes32 qid) public payable {
        if (!questionExist[qid]) {
            revert("question not exist");
        }

        questionInfo memory q = qs[questionIdx[qid]];
        if (q.person != msg.sender) {
            revert("cannot cancel other's question");
        }

        if (!isExpired(q.expirationSec)) {
            revert("cannot cancel question not expired");
        }

        if (!isEmptyString(q.answer)) {
            revert("cannot cancel question had been answered");
        }

        qs[questionIdx[qid]].canceled = true;

        if (q.reward == 0) {
            return;
        }
        payable(q.person).transfer(q.reward);
        emit cancelQuestionEvent(qid);
    }

    function withdraw() public payable onlyOwner {
        if (earnedRewards <= 0) {
            revert("no rewards");
        }
        payable(msg.sender).transfer(earnedRewards);
        earnedRewards = 0;
        emit withdrawEvent(earnedRewards);
    }
}
