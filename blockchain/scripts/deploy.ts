import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { network } from "hardhat";

const { ethers, networkName } = await network.create();
const [deployer] = await ethers.getSigners();

console.log(`Deploying StudentGrades to ${networkName}...`);
console.log(`Teacher owner: ${await deployer.getAddress()}`);

const studentGrades = await ethers.deployContract("StudentGrades");

console.log("Waiting for deployment transaction...");
await studentGrades.waitForDeployment();

const address = await studentGrades.getAddress();
const chain = await ethers.provider.getNetwork();

const deployment = {
  contractName: "StudentGrades",
  address,
  chainId: Number(chain.chainId),
  network: networkName,
  owner: await deployer.getAddress(),
  deployedAt: new Date().toISOString(),
};

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const deploymentPath = path.resolve(
  currentDir,
  "../../frontend/public/student-grades-deployment.json",
);

await mkdir(path.dirname(deploymentPath), { recursive: true });
await writeFile(deploymentPath, `${JSON.stringify(deployment, null, 2)}\n`, "utf8");

console.log(`StudentGrades address: ${address}`);
console.log(`Deployment JSON saved to: ${deploymentPath}`);

