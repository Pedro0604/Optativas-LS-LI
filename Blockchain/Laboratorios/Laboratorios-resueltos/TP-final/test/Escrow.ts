import { expect } from "chai";
import { network } from "hardhat";
import type { EscrowFactory } from "../types/ethers-contracts/EscrowFactory.js";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/types";
import type { BigNumberish } from "ethers";

const { ethers, networkHelpers } = await network.create();

describe("Escrow", function () {
  async function deployEscrowFactoryFixture() {
    const [owner, worker, otherAccount] = await ethers.getSigners();
    const escrowFactory = await ethers.deployContract("EscrowFactory");

    await escrowFactory.waitForDeployment();

    return {
      escrowFactory,
      owner,
      worker,
      otherAccount,
    };
  }

  async function createEscrow(
    escrowFactory: EscrowFactory,
    owner: HardhatEthersSigner,
    worker: HardhatEthersSigner,
    amount: Number,
    durationDays: BigNumberish,
    title: string,
  ) {
    const transaction = await escrowFactory
      .connect(owner)
      .createEscrow(worker.address, durationDays, title, {
        value: ethers.parseEther(String(amount)),
      });

    await transaction.wait();

    const escrowAddress = await escrowFactory.escrowsByOwner(owner.address, 0);

    return {
      transaction,
      escrowAddress,
      amount,
      durationDays,
      title,
    };
  }

  describe("constructor", function () {});
});
