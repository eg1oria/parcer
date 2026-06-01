import { expect } from "chai";
import hre from "hardhat";

const { ethers } = await hre.network.create();

async function deployStudentGrades() {
  const [owner, reader] = await ethers.getSigners();
  const contract = await ethers.deployContract("StudentGrades");

  return { contract, owner, reader };
}

describe("StudentGrades", function () {
  it("lets the owner add a student and read it back", async function () {
    const { contract, owner } = await deployStudentGrades();

    await expect(contract.addStudent("Ivan Kimran", "ivan@example.com"))
      .to.emit(contract, "StudentAdded")
      .withArgs(1n, "Ivan Kimran", "ivan@example.com", owner.address);

    expect(await contract.getStudentCount()).to.equal(1n);

    const student = await contract.getStudent(1);

    expect(student.id).to.equal(1n);
    expect(student.name).to.equal("Ivan Kimran");
    expect(student.email).to.equal("ivan@example.com");
    expect(student.gradeCount).to.equal(0n);
    expect(student.averageScore).to.equal(0n);
  });

  it("lets the owner add grades and calculates the average score", async function () {
    const { contract, owner } = await deployStudentGrades();

    await contract.addStudent("Egor Leontiev", "egor@example.com");

    await expect(contract.addGrade(1, "Solidity", 90))
      .to.emit(contract, "GradeAdded")
      .withArgs(1n, "Solidity", 90, owner.address);

    await contract.addGrade(1, "Blockchain", 80);

    expect(await contract.getAverageScore(1)).to.equal(85n);

    const grades = await contract.getGrades(1);

    expect(grades).to.have.lengthOf(2);
    expect(grades[0].subject).to.equal("Solidity");
    expect(grades[0].score).to.equal(90n);
    expect(grades[1].subject).to.equal("Blockchain");
    expect(grades[1].score).to.equal(80n);
  });

  it("rejects mutations from non-owner accounts", async function () {
    const { contract, reader } = await deployStudentGrades();

    await expect(
      contract.connect(reader).addStudent("Reader", "reader@example.com"),
    ).to.be.revertedWith("Only owner can mutate data");
  });

  it("rejects invalid grades and missing students", async function () {
    const { contract } = await deployStudentGrades();

    await expect(contract.addGrade(1, "Math", 90)).to.be.revertedWith(
      "Student does not exist",
    );

    await contract.addStudent("Nurlan Orakov", "nurlan@example.com");

    await expect(contract.addGrade(1, "Math", 101)).to.be.revertedWith(
      "Score must be <= 100",
    );
  });
});

