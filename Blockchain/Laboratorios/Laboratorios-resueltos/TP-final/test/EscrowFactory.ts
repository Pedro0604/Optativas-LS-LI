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
      it("Should revert the whole creation when Escrow construction fails", async function () {
        const { escrowFactory, owner, worker } =
          await networkHelpers.loadFixture(deployEscrowFactoryFixture);

        const factoryAddress = await escrowFactory.getAddress();

        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner,
            workerAddress: worker.address,
            durationDays: 0,
          }), // durationDays = 0 para que falle
        ).to.revert(ethers); // No interesa el error ahora, sino que revierta

        expect(await ethers.provider.getBalance(factoryAddress)).to.equal(0n);

        expect(
          await escrowFactory.getEscrowCountByOwner(owner.address),
        ).to.equal(0n);
        expect(
          await escrowFactory.getEscrowCountByWorker(worker.address),
        ).to.equal(0n);
        expect(await escrowFactory.getEscrowCount()).to.equal(0n);
      });
    });

    describe("event queries", function () {
      it("Should keep events consistent with the owner and worker escrows", async function () {
        const { escrowFactory, owner, worker, otherAccount } =
          await networkHelpers.loadFixture(deployEscrowFactoryFixture);

        const deploymentBlockNumber = await ethers.provider.getBlockNumber();

        const escrows = [
          {
            workerAddress: worker.address,
            amount: 1,
            durationDays: 10n,
            title: "Primer trabajo",
          },
          {
            workerAddress: otherAccount.address,
            amount: 2,
            durationDays: 20n,
            title: "Segundo trabajo",
          },
        ];

        for (const escrow of escrows) {
          await createEscrow({
            escrowFactory,
            owner,
            workerAddress: escrow.workerAddress,
            amountInEth: escrow.amount,
            durationDays: escrow.durationDays,
            title: escrow.title,
          });
        }

        // Owner
        const ownerFilter = escrowFactory.filters.EscrowCreated(owner.address); // El resto de parametros no interesan
        const ownerEvents = await escrowFactory.queryFilter(
          ownerFilter,
          deploymentBlockNumber,
          "latest",
        );

        expect(
          await escrowFactory.getEscrowCountByOwner(owner.address),
        ).to.equal(2n);
        expect(ownerEvents.length).to.equal(2);

        for (let index = 0; index < ownerEvents.length; index++) {
          const registeredAddress = await escrowFactory.escrowsByOwner(
            owner.address,
            index,
          );

          expect(ownerEvents[index].args.escrowAddress).to.equal(
            registeredAddress,
          );
        }

        // Worker
        const workerFilter = escrowFactory.filters.EscrowCreated(
          undefined, // No interesa la dirección del owner
          worker.address,
        );
        const workerEvents = await escrowFactory.queryFilter(
          workerFilter,
          deploymentBlockNumber,
          "latest",
        );

        // Uno de los escrows tiene como worker a otherAccount
        expect(
          await escrowFactory.getEscrowCountByWorker(worker.address),
        ).to.equal(1n);
        expect(workerEvents.length).to.equal(1);

        const registeredAddress = await escrowFactory.escrowsByWorker(
          worker.address,
          0,
        );
        expect(workerEvents[0].args.escrowAddress).to.equal(registeredAddress);
      });
    });
  });
});
