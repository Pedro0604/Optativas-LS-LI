import { expect } from "chai";
import {
  deployEscrowFactoryFixture,
  createEscrow,
  networkHelpers,
  ethers,
  deployEscrowFactoryWithDefaultEscrowFixture,
  sendCreateEscrow,
} from "./utils.js";

describe("EscrowFactory", function () {
  describe("deployment", function () {
    it("Should start with empty registries", async function () {
      const { escrowFactory, owner, worker } = await networkHelpers.loadFixture(
        deployEscrowFactoryFixture,
      );

      expect(await escrowFactory.getEscrowCount()).to.equal(0n);

      expect(await escrowFactory.getEscrowCountByOwner(owner.address)).to.equal(
        0n,
      );
      expect(
        await escrowFactory.getEscrowCountByWorker(worker.address),
      ).to.equal(0n);
    });
  });

  describe("createEscrow", function () {
    describe("successful creation", function () {
      it("Should register the escrow for its owner, worker and in the allEscrows array", async function () {
        const { escrowFactory, escrowAddress, owner, worker } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        // All escrows
        expect(await escrowFactory.getEscrowCount()).to.equal(1n);
        expect(await escrowFactory.allEscrows(0)).to.equal(escrowAddress);

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
      });

      it("Should not register participants under the wrong roles", async function () {
        const { escrowFactory, owner, worker } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        expect(
          await escrowFactory.getEscrowCountByWorker(owner.address),
        ).to.equal(0n);
        expect(
          await escrowFactory.getEscrowCountByOwner(worker.address),
        ).to.equal(0n);
      });

      it("Should transfer all provided ETH to the new escrow", async function () {
        const { escrowFactory, escrowAddress, amountInWei } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        const factoryAddress = await escrowFactory.getAddress();

        expect(await ethers.provider.getBalance(factoryAddress)).to.equal(0n);

        expect(await ethers.provider.getBalance(escrowAddress)).to.equal(
          amountInWei,
        );
      });

      it("Should emit EscrowCreated with the escrow creation data", async function () {
        const {
          escrowFactory,
          owner,
          escrowAddress,
          transaction,
          worker,
          amountInWei,
          durationDays,
        } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        await expect(transaction)
          .to.emit(escrowFactory, "EscrowCreated")
          .withArgs(
            owner.address,
            worker.address,
            escrowAddress,
            amountInWei,
            durationDays,
          );
      });
    });

    describe("multiple escrows", function () {
      it("Should preserve multiple escrows in creation order", async function () {
        const { escrowFactory, owner, worker, escrowAddress } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        const result = await createEscrow({
          escrowFactory,
          owner,
          workerAddress: worker.address,
        }); // Mismo owner y factory
        const secondEscrowAddress = result.escrowAddress;

        expect(escrowAddress).not.to.equal(secondEscrowAddress);

        // 2 escrows en total
        expect(
          await escrowFactory.getEscrowCountByOwner(owner.address),
        ).to.equal(2n);
        expect(
          await escrowFactory.getEscrowCountByWorker(worker.address),
        ).to.equal(2n);
        expect(await escrowFactory.getEscrowCount()).to.equal(2n);

        // Dirección de default escrow
        expect(await escrowFactory.escrowsByOwner(owner.address, 0)).to.equal(
          escrowAddress,
        );
        expect(await escrowFactory.escrowsByWorker(worker.address, 0)).to.equal(
          escrowAddress,
        );
        expect(await escrowFactory.allEscrows(0)).to.equal(escrowAddress);

        // Dirección de segundo escrow
        expect(await escrowFactory.escrowsByOwner(owner.address, 1)).to.equal(
          secondEscrowAddress,
        );
        expect(await escrowFactory.escrowsByWorker(worker.address, 1)).to.equal(
          secondEscrowAddress,
        );
        expect(await escrowFactory.allEscrows(1)).to.equal(secondEscrowAddress);
      });

      it("Should maintain independent owner and worker indexes", async function () {
        const { escrowFactory, owner, worker, otherAccount } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        await createEscrow({
          escrowFactory,
          owner: otherAccount,
          workerAddress: owner.address,
          amountInEth: 2,
          durationDays: 15,
        });

        expect(await escrowFactory.getEscrowCount()).to.equal(2n);

        // Owner escrows
        expect(
          await escrowFactory.getEscrowCountByOwner(owner.address),
        ).to.equal(1n); // El default
        expect(
          await escrowFactory.getEscrowCountByWorker(owner.address),
        ).to.equal(1n); // El segundo escrow creado (worker: owner.address)

        // Worker escrows
        expect(
          await escrowFactory.getEscrowCountByOwner(worker.address),
        ).to.equal(0n); // No hay
        expect(
          await escrowFactory.getEscrowCountByWorker(worker.address),
        ).to.equal(1n); // El default

        // OtherAccount escrows
        expect(
          await escrowFactory.getEscrowCountByOwner(otherAccount.address),
        ).to.equal(1n); // El segundo escrow creado (owner: otherAccount.address)
        expect(
          await escrowFactory.getEscrowCountByWorker(otherAccount.address),
        ).to.equal(0n); // No hay
      });
    });

    describe("failures", function () {
      it("Should preserve all existing state when Escrow construction fails", async function () {
        const {
          escrowFactory,
          owner: account1,
          worker: account2,
          otherAccount: account3,
          escrowAddress: firstEscrowAddress,
        } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        const { escrowAddress: secondEscrowAddress } = await createEscrow({
          escrowFactory,
          owner: account3,
          workerAddress: account1.address,
          amountInEth: 2,
          durationDays: 15n,
          title: "Segundo escrow válido",
        });

        const factoryAddress = await escrowFactory.getAddress();

        // Estado previo al intento inválido
        const globalCountBefore = await escrowFactory.getEscrowCount();

        const account1OwnerCountBefore =
          await escrowFactory.getEscrowCountByOwner(account1.address);
        const account1WorkerCountBefore =
          await escrowFactory.getEscrowCountByWorker(account1.address);

        const account2OwnerCountBefore =
          await escrowFactory.getEscrowCountByOwner(account2.address);
        const account2WorkerCountBefore =
          await escrowFactory.getEscrowCountByWorker(account2.address);

        const account3OwnerCountBefore =
          await escrowFactory.getEscrowCountByOwner(account3.address);
        const account3WorkerCountBefore =
          await escrowFactory.getEscrowCountByWorker(account3.address);

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
            amountInEth: 3,
            durationDays: 0n,
            title: "Escrow inválido",
          }),
        ).to.revert(ethers);

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
          await escrowFactory.getEscrowCountByOwner(account2.address),
        ).to.equal(account2OwnerCountBefore);

        expect(
          await escrowFactory.getEscrowCountByWorker(account2.address),
        ).to.equal(account2WorkerCountBefore);

        expect(
          await escrowFactory.getEscrowCountByOwner(account3.address),
        ).to.equal(account3OwnerCountBefore);

        expect(
          await escrowFactory.getEscrowCountByWorker(account3.address),
        ).to.equal(account3WorkerCountBefore);

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
