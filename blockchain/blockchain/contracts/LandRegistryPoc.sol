// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract LandRegistryPoC {
    enum Status { Pending, Approved, Rejected }
    enum Role   { None, Submitter, Officer, Admin }

    struct LandDetails {
        string ownerName;
        string locationAddress;
        string areaSize;
        string pictureHash;
    }

    struct LandPaper {
        uint id;
        address owner;
        LandDetails details;
        string docHash;
        Status status;
    }

    address public admin;
    uint    public nextId;
    uint    public requiredApprovals = 2;

    mapping(address => bool)                   public submitters;
    mapping(uint    => LandPaper)              public landPapers;
    mapping(address => bool)                   public authorizedOfficers;
    mapping(uint    => mapping(address=>bool)) public approvals;
    mapping(uint    => uint)                   public approvalCount;

    event Submitted(uint indexed id, address indexed owner);
    event Reviewed(uint indexed id, Status status);
    event OfficerAdded(address indexed officer);
    event OfficerRemoved(address indexed officer);
    event SubmitterAdded(address indexed who);

    constructor() {
        admin = msg.sender;
        authorizedOfficers[msg.sender] = true;
        submitters[msg.sender] = true;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyOfficer() {
        require(authorizedOfficers[msg.sender], "Not an officer");
        _;
    }

    modifier onlySubmitter() {
        require(submitters[msg.sender], "Not a submitter");
        _;
    }

    function addOfficer(address officer) external onlyAdmin {
        authorizedOfficers[officer] = true;
        emit OfficerAdded(officer);
    }

    function removeOfficer(address officer) external onlyAdmin {
        authorizedOfficers[officer] = false;
        emit OfficerRemoved(officer);
    }

    function addSubmitter(address who) external onlyAdmin {
        submitters[who] = true;
        emit SubmitterAdded(who);
    }

    function submitLand(
        string calldata ownerName,
        string calldata locationAddress,
        string calldata areaSize,
        string calldata pictureHash,
        string calldata docHash
    )
        external
        onlySubmitter
    {
        landPapers[nextId] = LandPaper(
            nextId,
            msg.sender,
            LandDetails(ownerName, locationAddress, areaSize, pictureHash),
            docHash,
            Status.Pending
        );
        emit Submitted(nextId, msg.sender);
        nextId++;
    }

    function reviewLandMulti(uint id, bool approve) external onlyOfficer {
        require(landPapers[id].status == Status.Pending, "Already reviewed");
        require(!approvals[id][msg.sender], "Already reviewed by you");

        approvals[id][msg.sender] = true;

        if (!approve) {
            landPapers[id].status = Status.Rejected;
            emit Reviewed(id, Status.Rejected);
            return;
        }

        approvalCount[id]++;
        if (approvalCount[id] >= requiredApprovals) {
            landPapers[id].status = Status.Approved;
            emit Reviewed(id, Status.Approved);
        }
    }

    function getLand(uint id) external view returns (LandPaper memory) {
        return landPapers[id];
    }

    function setRequiredApprovals(uint count) external onlyAdmin {
        requiredApprovals = count;
    }

    function hasReviewed(uint id, address officer) external view returns (bool) {
        return approvals[id][officer];
    }

    /// @notice Returns 0=No role, 1=Submitter, 2=Officer, 3=Admin
    function getRole(address who) external view returns (Role) {
        if (who == admin) {
            return Role.Admin;
        } else if (authorizedOfficers[who]) {
            return Role.Officer;
        } else if (submitters[who]) {
            return Role.Submitter;
        } else {
            return Role.None;
        }
    }
}
