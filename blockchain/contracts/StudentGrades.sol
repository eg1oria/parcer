// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract StudentGrades {
    struct Student {
        uint256 id;
        string name;
        string email;
        uint256 gradeCount;
        uint256 totalScore;
        bool exists;
    }

    struct Grade {
        string subject;
        uint8 score;
        uint256 timestamp;
        address teacher;
    }

    address public owner;

    uint256 private nextStudentId = 1;
    uint256[] private studentIds;
    mapping(uint256 => Student) private students;
    mapping(uint256 => Grade[]) private gradesByStudent;

    event StudentAdded(uint256 indexed studentId, string name, string email, address indexed teacher);
    event GradeAdded(uint256 indexed studentId, string subject, uint8 score, address indexed teacher);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can mutate data");
        _;
    }

    modifier studentExists(uint256 studentId) {
        require(students[studentId].exists, "Student does not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addStudent(string calldata name, string calldata email) external onlyOwner returns (uint256) {
        require(bytes(name).length > 0, "Name is required");
        require(bytes(email).length > 0, "Email is required");

        uint256 studentId = nextStudentId;
        nextStudentId++;

        students[studentId] = Student({
            id: studentId,
            name: name,
            email: email,
            gradeCount: 0,
            totalScore: 0,
            exists: true
        });

        studentIds.push(studentId);

        emit StudentAdded(studentId, name, email, msg.sender);

        return studentId;
    }

    function addGrade(uint256 studentId, string calldata subject, uint8 score)
        external
        onlyOwner
        studentExists(studentId)
    {
        require(bytes(subject).length > 0, "Subject is required");
        require(score <= 100, "Score must be <= 100");

        gradesByStudent[studentId].push(Grade({
            subject: subject,
            score: score,
            timestamp: block.timestamp,
            teacher: msg.sender
        }));

        Student storage student = students[studentId];
        student.gradeCount++;
        student.totalScore += score;

        emit GradeAdded(studentId, subject, score, msg.sender);
    }

    function getStudent(uint256 studentId)
        external
        view
        studentExists(studentId)
        returns (
            uint256 id,
            string memory name,
            string memory email,
            uint256 gradeCount,
            uint256 averageScore
        )
    {
        Student storage student = students[studentId];

        return (
            student.id,
            student.name,
            student.email,
            student.gradeCount,
            getAverageScore(studentId)
        );
    }

    function getGrades(uint256 studentId) external view studentExists(studentId) returns (Grade[] memory) {
        return gradesByStudent[studentId];
    }

    function getStudentCount() external view returns (uint256) {
        return studentIds.length;
    }

    function getAverageScore(uint256 studentId) public view studentExists(studentId) returns (uint256) {
        Student storage student = students[studentId];

        if (student.gradeCount == 0) {
            return 0;
        }

        return student.totalScore / student.gradeCount;
    }
}

