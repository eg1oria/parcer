import type { Metadata } from "next";

import { StudentGradesDapp } from "./student-grades-dapp";

export const metadata: Metadata = {
  title: "StudentGrades DApp",
  description:
    "Минималистичная локальная DApp на Hardhat, Solidity, ethers.js и MetaMask для хранения успеваемости студентов.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BlockchainPage() {
  return <StudentGradesDapp />;
}
