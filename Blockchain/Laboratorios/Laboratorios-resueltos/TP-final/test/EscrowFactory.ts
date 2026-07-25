import { expect } from "chai";
import { network } from "hardhat";
import type { EscrowFactory } from "../types/ethers-contracts/EscrowFactory.js";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/types";

const { ethers, networkHelpers } = await network.create();

describe("EscrowFactory", function () {
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

  async function createDefaultEscrow(
    escrowFactory: EscrowFactory,
    owner: HardhatEthersSigner,
    worker: HardhatEthersSigner,
  ) {
    const amount = ethers.parseEther("1");
    const durationDays = 30n;
    const title = "Escrow de prueba";

    const transaction = await escrowFactory
      .connect(owner)
      .createEscrow(worker.address, durationDays, title, {
        value: amount,
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

  async function deployAndCreateDefaultEscrow() {
    const { escrowFactory, owner, worker, otherAccount } =
      await networkHelpers.loadFixture(deployEscrowFactoryFixture);

    const { transaction, escrowAddress, amount, durationDays, title } =
      await createDefaultEscrow(escrowFactory, owner, worker);

    return {
      escrowFactory,
      owner,
      worker,
      otherAccount,
      transaction,
      escrowAddress,
      amount,
      durationDays,
      title,
    };
  }

  describe("createEscrow", function () {
    it("Should emit EscrowCreated with the created escrow address", async function () {
      const {
        escrowFactory,
        owner,
        escrowAddress,
        transaction,
        worker,
        amount,
        durationDays,
      } = await deployAndCreateDefaultEscrow();

      await expect(transaction)
        .to.emit(escrowFactory, "EscrowCreated")
        .withArgs(
          owner.address,
          worker.address,
          escrowAddress,
          amount,
          durationDays,
        );
    });

    it("Should register the escrow for its owner", async function () {
      const { escrowFactory, owner, escrowAddress } =
        await deployAndCreateDefaultEscrow();

      expect(await escrowFactory.getEscrowCountByOwner(owner.address)).to.equal(
        1n,
      );

      expect(await escrowFactory.escrowsByOwner(owner.address, 0)).to.equal(
        escrowAddress,
      );
    });

    it("Should register the escrow for its worker", async function () {
      const { escrowFactory, worker, escrowAddress } =
        await deployAndCreateDefaultEscrow();

      expect(
        await escrowFactory.getEscrowCountByWorker(worker.address),
      ).to.equal(1n);

      expect(await escrowFactory.escrowsByWorker(worker.address, 0)).to.equal(
        escrowAddress,
      );
    });

    it("Should not register the owner as worker", async function () {
      const { escrowFactory, owner } = await deployAndCreateDefaultEscrow();

      expect(
        await escrowFactory.getEscrowCountByWorker(owner.address),
      ).to.equal(0n);
    });

    it("Should not register the worker as owner", async function () {
      const { escrowFactory, worker } = await deployAndCreateDefaultEscrow();

      expect(
        await escrowFactory.getEscrowCountByOwner(worker.address),
      ).to.equal(0n);
    });

    it("Should transfer all provided ETH to the new escrow", async function () {
      const { escrowFactory, escrowAddress, amount } =
        await deployAndCreateDefaultEscrow();

      const factoryAddress = await escrowFactory.getAddress();

      expect(await ethers.provider.getBalance(factoryAddress)).to.equal(0n);

      expect(await ethers.provider.getBalance(escrowAddress)).to.equal(amount);
    });

    it("Should allow to create multiple escrows", async function () {
      const { escrowFactory, owner, worker } =
        await deployAndCreateDefaultEscrow();

      await createDefaultEscrow(escrowFactory, owner, worker); // Mismo owner y factory

      expect(await escrowFactory.getEscrowCountByOwner(owner.address)).to.equal(
        2n,
      );

      expect(
        await escrowFactory.getEscrowCountByWorker(worker.address),
      ).to.equal(2n);
    });

    it("Should revert the whole creation when Escrow construction fails", async function () {
      const { escrowFactory, owner, worker } = await networkHelpers.loadFixture(
        deployEscrowFactoryFixture,
      );

      const factoryAddress = await escrowFactory.getAddress();

      const amount = ethers.parseEther("2");
      const durationDays = 0n; // Para que falle (luego se testean los diferentes fallos en el test de Escrow)
      const title = "Escrow fallido de prueba";

      await expect(
        escrowFactory
          .connect(owner)
          .createEscrow(worker.address, durationDays, title, {
            value: amount,
          }),
      ).to.revert(ethers); // No interesa el error ahora, sino que revierta

      expect(await ethers.provider.getBalance(factoryAddress)).to.equal(0n);

      expect(await escrowFactory.getEscrowCountByOwner(owner.address)).to.equal(
        0n,
      );

      expect(
        await escrowFactory.getEscrowCountByWorker(worker.address),
      ).to.equal(0n);
    });

    it("Should keep owner events consistent with the registered escrows", async function () {
      const { escrowFactory, owner, worker, otherAccount } =
        await networkHelpers.loadFixture(deployEscrowFactoryFixture);

      const deploymentBlockNumber = await ethers.provider.getBlockNumber();

      const escrows = [
        {
          worker: worker.address,
          amount: ethers.parseEther("1"),
          durationDays: 10n,
          title: "Primer trabajo",
        },
        {
          worker: otherAccount.address,
          amount: ethers.parseEther("2"),
          durationDays: 20n,
          title: "Segundo trabajo",
        },
      ];

      for (const escrow of escrows) {
        await (
          await escrowFactory
            .connect(owner)
            .createEscrow(escrow.worker, escrow.durationDays, escrow.title, {
              value: escrow.amount,
            })
        ).wait();
      }

      const filter = escrowFactory.filters.EscrowCreated(owner.address); // El resto de parametros no interesan

      const events = await escrowFactory.queryFilter(
        filter,
        deploymentBlockNumber,
        "latest",
      );

      expect(events.length).to.equal(2);

      expect(await escrowFactory.getEscrowCountByOwner(owner.address)).to.equal(
        BigInt(events.length),
      );

      for (let index = 0; index < events.length; index++) {
        const registeredAddress = await escrowFactory.escrowsByOwner(
          owner.address,
          index,
        );

        expect(events[index].args.escrowAddress).to.equal(registeredAddress);
      }
    });

    it("Should keep worker events consistent with the registered escrows", async function () {
      const { escrowFactory, owner, worker, otherAccount } =
        await networkHelpers.loadFixture(deployEscrowFactoryFixture);

      const deploymentBlockNumber = await ethers.provider.getBlockNumber();

      const escrows = [
        {
          worker: worker.address,
          amount: ethers.parseEther("1"),
          durationDays: 10n,
          title: "Primer trabajo",
        },
        {
          worker: otherAccount.address,
          amount: ethers.parseEther("2"),
          durationDays: 20n,
          title: "Segundo trabajo",
        },
      ];

      for (const escrow of escrows) {
        await (
          await escrowFactory
            .connect(owner)
            .createEscrow(escrow.worker, escrow.durationDays, escrow.title, {
              value: escrow.amount,
            })
        ).wait();
      }

      const filter = escrowFactory.filters.EscrowCreated(
        undefined, // No interesa la dirección del owner
        worker.address,
      );

      const events = await escrowFactory.queryFilter(
        filter,
        deploymentBlockNumber,
        "latest",
      );

      expect(events.length).to.equal(1); // Un escrow tiene como worker a otherAccount

      expect(
        await escrowFactory.getEscrowCountByWorker(worker.address),
      ).to.equal(BigInt(events.length));

      for (let index = 0; index < events.length; index++) {
        const registeredAddress = await escrowFactory.escrowsByWorker(
          worker.address,
          index,
        );

        expect(events[index].args.escrowAddress).to.equal(registeredAddress);
      }
    });

    it("Should match emitted amounts with stored escrow amounts", async function () {
      const { escrowFactory, owner, worker } = await networkHelpers.loadFixture(
        deployEscrowFactoryFixture,
      );

      const fromBlock = await ethers.provider.getBlockNumber();

      const amounts = [
        ethers.parseEther("1"),
        ethers.parseEther("2"),
        ethers.parseEther("0.5"),
      ];

      const summedAmount = amounts.reduce((prev, cur) => prev + cur, 0n);

      for (let index = 0; index < amounts.length; index++) {
        await (
          await escrowFactory
            .connect(owner)
            .createEscrow(
              worker.address,
              BigInt(index + 1),
              `Trabajo ${index + 1}`,
              { value: amounts[index] },
            )
        ).wait();
      }

      const events = await escrowFactory.queryFilter(
        escrowFactory.filters.EscrowCreated(owner.address),
        fromBlock,
        "latest",
      );

      let totalEmitted = 0n;
      let totalStored = 0n;

      for (const event of events) {
        totalEmitted += event.args.amount;

        const escrow = await ethers.getContractAt(
          "Escrow",
          event.args.escrowAddress,
        );

        totalStored += await escrow.amount();
      }

      expect(totalEmitted).to.equal(totalStored).to.equal(summedAmount);
    });
  });
});
