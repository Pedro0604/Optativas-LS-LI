import { expect } from "chai";
import { Event } from "./constants/Event.js";
import { defaultEscrowFixture } from "./helpers/fixtures.js";
import { ethers, networkHelpers, SECONDS_PER_DAY } from "./helpers/globals.js";
import { createEscrow, sendCreateEscrow } from "./helpers/createEscrow.js";

describe("EscrowFactory", function () {
  describe("deployment", function () {
    it("Should start with empty registries", async function () {
      const escrowFactory = await ethers.deployContract("EscrowFactory");

      await escrowFactory.waitForDeployment();

      expect(await escrowFactory.getEscrowCount()).to.equal(0n);
    });
  });

  describe("createEscrow", function () {
    describe("successful creation", function () {
      it("Should register the escrow for its owner, worker, arbiter, in the allEscrows array and check IsEscrow returns true", async function () {
        const { escrowFactory, escrowAddress, owner, worker, arbiter } =
          await networkHelpers.loadFixture(defaultEscrowFixture);

        // All escrows
        expect(await escrowFactory.getEscrowCount()).to.equal(1n);
        expect(await escrowFactory.allEscrows(0)).to.equal(escrowAddress);

        // IsEscrow
        expect(await escrowFactory.isEscrow(escrowAddress)).to.be.true;

        // Owner
        expect(
          await escrowFactory.getEscrowCountByOwner(owner.address),
        ).to.equal(1n);
        expect(await escrowFactory.escrowsByOwner(owner.address, 0)).to.equal(
          escrowAddress,
        );

        // Worker
        expect(
          await escrowFactory.getEscrowCountByWorker(worker.address),
        ).to.equal(1n);
        expect(await escrowFactory.escrowsByWorker(worker.address, 0)).to.equal(
          escrowAddress,
        );

        // Arbiter
        expect(
          await escrowFactory.getEscrowCountByArbiter(arbiter.address),
        ).to.equal(1n);
        expect(
          await escrowFactory.escrowsByArbiter(arbiter.address, 0),
        ).to.equal(escrowAddress);
      });

      it("Should not register participants under the wrong roles", async function () {
        const { escrowFactory, owner, worker, arbiter } =
          await networkHelpers.loadFixture(defaultEscrowFixture);

        // Owner
        expect(
          await escrowFactory.getEscrowCountByWorker(owner.address),
        ).to.equal(0n);
        expect(
          await escrowFactory.getEscrowCountByArbiter(owner.address),
        ).to.equal(0n);

        // Worker
        expect(
          await escrowFactory.getEscrowCountByOwner(worker.address),
        ).to.equal(0n);
        expect(
          await escrowFactory.getEscrowCountByArbiter(worker.address),
        ).to.equal(0n);

        // Arbiter
        expect(
          await escrowFactory.getEscrowCountByOwner(arbiter.address),
        ).to.equal(0n);
        expect(
          await escrowFactory.getEscrowCountByWorker(arbiter.address),
        ).to.equal(0n);
      });

      it("Should transfer all provided ETH to the new escrow", async function () {
        const { escrowFactory, escrowAddress, amountInWei } =
          await networkHelpers.loadFixture(defaultEscrowFixture);

        const factoryAddress = await escrowFactory.getAddress();

        expect(await ethers.provider.getBalance(factoryAddress)).to.equal(0n);

        expect(await ethers.provider.getBalance(escrowAddress)).to.equal(
          amountInWei,
        );
      });

      it(`Should emit the ${Event.EscrowCreated} event with the escrow creation data`, async function () {
        const {
          escrowFactory,
          owner,
          worker,
          arbiter,
          escrowAddress,
          transaction,
          amountInWei,
          acceptanceDuration,
          submissionDuration,
          reviewDuration,
          arbitrationDuration,
        } = await networkHelpers.loadFixture(defaultEscrowFixture);

        await expect(transaction)
          .to.emit(escrowFactory, Event.EscrowCreated)
          .withArgs(
            owner.address,
            worker.address,
            arbiter.address,
            escrowAddress,
            amountInWei,
            acceptanceDuration,
            submissionDuration,
            reviewDuration,
            arbitrationDuration,
          );
      });
    });

    describe("multiple escrows", function () {
      it("Should preserve multiple escrows in creation order", async function () {
        const { escrowFactory, escrowAddress, owner, worker, arbiter } =
          await networkHelpers.loadFixture(defaultEscrowFixture);

        const result = await createEscrow({
          escrowFactory,
          owner,
          workerAddress: worker.address,
          arbiterAddress: arbiter.address,
        });
        const secondEscrowAddress = result.escrowAddress;

        expect(escrowAddress).not.to.equal(secondEscrowAddress);

        // Ambos son escrows
        expect(await escrowFactory.isEscrow(escrowAddress)).to.be.true;
        expect(await escrowFactory.isEscrow(secondEscrowAddress)).to.be.true;

        // 2 escrows en total
        expect(
          await escrowFactory.getEscrowCountByOwner(owner.address),
        ).to.equal(2n);
        expect(
          await escrowFactory.getEscrowCountByWorker(worker.address),
        ).to.equal(2n);
        expect(
          await escrowFactory.getEscrowCountByArbiter(arbiter.address),
        ).to.equal(2n);
        expect(await escrowFactory.getEscrowCount()).to.equal(2n);

        // Dirección de default escrow
        expect(await escrowFactory.escrowsByOwner(owner.address, 0)).to.equal(
          escrowAddress,
        );
        expect(await escrowFactory.escrowsByWorker(worker.address, 0)).to.equal(
          escrowAddress,
        );
        expect(
          await escrowFactory.escrowsByArbiter(arbiter.address, 0),
        ).to.equal(escrowAddress);
        expect(await escrowFactory.allEscrows(0)).to.equal(escrowAddress);

        // Dirección de segundo escrow
        expect(await escrowFactory.escrowsByOwner(owner.address, 1)).to.equal(
          secondEscrowAddress,
        );
        expect(await escrowFactory.escrowsByWorker(worker.address, 1)).to.equal(
          secondEscrowAddress,
        );
        expect(
          await escrowFactory.escrowsByArbiter(arbiter.address, 1),
        ).to.equal(secondEscrowAddress);
        expect(await escrowFactory.allEscrows(1)).to.equal(secondEscrowAddress);
      });

      it("Should maintain independent owner, worker and arbiter indexes", async function () {
        const { escrowFactory, owner, worker, arbiter } =
          await networkHelpers.loadFixture(defaultEscrowFixture);

        await createEscrow({
          escrowFactory,
          owner: arbiter,
          workerAddress: owner.address,
          arbiterAddress: worker.address,
          amountInEth: 2n,
          acceptanceDuration: SECONDS_PER_DAY * 10n,
        });

        expect(await escrowFactory.getEscrowCount()).to.equal(2n);

        // Owner escrows
        expect(
          await escrowFactory.getEscrowCountByOwner(owner.address),
        ).to.equal(1n); // El default
        expect(
          await escrowFactory.getEscrowCountByWorker(owner.address),
        ).to.equal(1n); // El segundo escrow creado (workerAddress: owner.address)
        expect(
          await escrowFactory.getEscrowCountByArbiter(owner.address),
        ).to.equal(0n);

        // Worker escrows
        expect(
          await escrowFactory.getEscrowCountByOwner(worker.address),
        ).to.equal(0n);
        expect(
          await escrowFactory.getEscrowCountByWorker(worker.address),
        ).to.equal(1n); // El default
        expect(
          await escrowFactory.getEscrowCountByArbiter(worker.address),
        ).to.equal(1n); // El segundo escrow creado (arbiterAddress: worker.address)

        // Arbiter escrows
        expect(
          await escrowFactory.getEscrowCountByOwner(arbiter.address),
        ).to.equal(1n); // El segundo escrow creado (owner: arbiter)
        expect(
          await escrowFactory.getEscrowCountByWorker(arbiter.address),
        ).to.equal(0n);
        expect(
          await escrowFactory.getEscrowCountByArbiter(arbiter.address),
        ).to.equal(1n); // El default
      });
    });

    describe("failures", function () {
      it("Should preserve all existing state when Escrow construction fails", async function () {
        const {
          escrowFactory,
          owner: account1,
          worker: account2,
          arbiter: account3,
          escrowAddress: firstEscrowAddress,
        } = await networkHelpers.loadFixture(defaultEscrowFixture);

        const { escrowAddress: secondEscrowAddress } = await createEscrow({
          escrowFactory,
          owner: account3,
          workerAddress: account1.address,
          arbiterAddress: account2.address,
          amountInEth: 2n,
          acceptanceDuration: SECONDS_PER_DAY * 15n,
          title: "Segundo escrow válido",
        });

        const factoryAddress = await escrowFactory.getAddress();

        // Estado previo al intento inválido
        const globalCountBefore = await escrowFactory.getEscrowCount();

        const account1OwnerCountBefore =
          await escrowFactory.getEscrowCountByOwner(account1.address);
        const account1WorkerCountBefore =
          await escrowFactory.getEscrowCountByWorker(account1.address);
        const account1ArbiterCountBefore =
          await escrowFactory.getEscrowCountByArbiter(account1.address);

        const account2OwnerCountBefore =
          await escrowFactory.getEscrowCountByOwner(account2.address);
        const account2WorkerCountBefore =
          await escrowFactory.getEscrowCountByWorker(account2.address);
        const account2ArbiterCountBefore =
          await escrowFactory.getEscrowCountByArbiter(account2.address);

        const account3OwnerCountBefore =
          await escrowFactory.getEscrowCountByOwner(account3.address);
        const account3WorkerCountBefore =
          await escrowFactory.getEscrowCountByWorker(account3.address);
        const account3ArbiterCountBefore =
          await escrowFactory.getEscrowCountByArbiter(account3.address);

        const allEscrowsBefore = [
          await escrowFactory.allEscrows(0),
          await escrowFactory.allEscrows(1),
        ];

        const account1OwnerEscrowsBefore = [
          await escrowFactory.escrowsByOwner(account1.address, 0),
        ];
        const account1WorkerEscrowsBefore = [
          await escrowFactory.escrowsByWorker(account1.address, 0),
        ];

        const account2WorkerEscrowsBefore = [
          await escrowFactory.escrowsByWorker(account2.address, 0),
        ];
        const account2ArbiterEscrowsBefore = [
          await escrowFactory.escrowsByArbiter(account2.address, 0),
        ];

        const account3ArbiterEscrowsBefore = [
          await escrowFactory.escrowsByArbiter(account3.address, 0),
        ];
        const account3OwnerEscrowsBefore = [
          await escrowFactory.escrowsByOwner(account3.address, 0),
        ];

        const factoryBalanceBefore =
          await ethers.provider.getBalance(factoryAddress);

        const firstEscrowBalanceBefore =
          await ethers.provider.getBalance(firstEscrowAddress);

        const secondEscrowBalanceBefore =
          await ethers.provider.getBalance(secondEscrowAddress);

        // Creación fallida por durationDays = 0
        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner: account1,
            workerAddress: account2.address,
            arbiterAddress: account3.address,
            amountInEth: 3n,
            acceptanceDuration: 0n,
            title: "Escrow inválido",
          }),
        ).to.revert(ethers);

        // Una creación revertida no registra direcciones espurias.
        expect(await escrowFactory.isEscrow(ethers.ZeroAddress)).to.be.false;
        expect(await escrowFactory.isEscrow(firstEscrowAddress)).to.be.true;
        expect(await escrowFactory.isEscrow(secondEscrowAddress)).to.be.true;

        // Los counts deben mantenerse
        expect(await escrowFactory.getEscrowCount()).to.equal(
          globalCountBefore,
        );

        expect(
          await escrowFactory.getEscrowCountByOwner(account1.address),
        ).to.equal(account1OwnerCountBefore);
        expect(
          await escrowFactory.getEscrowCountByWorker(account1.address),
        ).to.equal(account1WorkerCountBefore);
        expect(
          await escrowFactory.getEscrowCountByArbiter(account1.address),
        ).to.equal(account1ArbiterCountBefore);

        expect(
          await escrowFactory.getEscrowCountByOwner(account2.address),
        ).to.equal(account2OwnerCountBefore);
        expect(
          await escrowFactory.getEscrowCountByWorker(account2.address),
        ).to.equal(account2WorkerCountBefore);
        expect(
          await escrowFactory.getEscrowCountByArbiter(account2.address),
        ).to.equal(account2ArbiterCountBefore);

        expect(
          await escrowFactory.getEscrowCountByOwner(account3.address),
        ).to.equal(account3OwnerCountBefore);
        expect(
          await escrowFactory.getEscrowCountByWorker(account3.address),
        ).to.equal(account3WorkerCountBefore);
        expect(
          await escrowFactory.getEscrowCountByArbiter(account3.address),
        ).to.equal(account3ArbiterCountBefore);

        // Las direcciones existentes deben mantener su orden
        expect(await escrowFactory.allEscrows(0)).to.equal(allEscrowsBefore[0]);
        expect(await escrowFactory.allEscrows(1)).to.equal(allEscrowsBefore[1]);

        expect(
          await escrowFactory.escrowsByOwner(account1.address, 0),
        ).to.equal(account1OwnerEscrowsBefore[0]);
        expect(
          await escrowFactory.escrowsByWorker(account1.address, 0),
        ).to.equal(account1WorkerEscrowsBefore[0]);

        expect(
          await escrowFactory.escrowsByWorker(account2.address, 0),
        ).to.equal(account2WorkerEscrowsBefore[0]);
        expect(
          await escrowFactory.escrowsByArbiter(account2.address, 0),
        ).to.equal(account2ArbiterEscrowsBefore[0]);

        expect(
          await escrowFactory.escrowsByArbiter(account3.address, 0),
        ).to.equal(account3ArbiterEscrowsBefore[0]);
        expect(
          await escrowFactory.escrowsByOwner(account3.address, 0),
        ).to.equal(account3OwnerEscrowsBefore[0]);

        // Ningún ETH debe quedar retenido ni alterar los escrows existentes
        expect(await ethers.provider.getBalance(factoryAddress)).to.equal(
          factoryBalanceBefore,
        );
        expect(await ethers.provider.getBalance(firstEscrowAddress)).to.equal(
          firstEscrowBalanceBefore,
        );
        expect(await ethers.provider.getBalance(secondEscrowAddress)).to.equal(
          secondEscrowBalanceBefore,
        );
      });
    });
  });
});
