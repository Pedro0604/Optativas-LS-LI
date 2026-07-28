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

  // TODO - REFACTOR PARA USAR UN CREATE_ESCROW QUE COMO DEFAULT TENGA 1, 30 Y "ESCROW DE PRUEBA", ASÍ CUANDO SE NECESITA CREAR MÁS DE UN ESCROW,
  // SE PUEDE HACER FACILMENTE, Y ELIMINAR EL ESCROW_ADRESS QUE OBTIENE EL ADDRESS DEL PRIMER ESCROW, PORQUE SI NO ES EL PRIMERO, DEVUELVE OTRA ADDRESS
  // A LO SUMO, USAR EL VALOR DE RETORNO DE CREATE_ESCROW, O EL EVENT ESCROW_CREATED
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

  describe("deployement", function () {
    it("Should not have any escrow when just deployed", async function () {
      const { escrowFactory } = await networkHelpers.loadFixture(
        deployEscrowFactoryFixture,
      );

      expect(await escrowFactory.getEscrowCount()).to.equal(0n);
    });

    it("Should have escrows count by owner and worker in zero", async function () {
      const { escrowFactory, owner, worker } = await networkHelpers.loadFixture(
        deployEscrowFactoryFixture,
      );

      expect(await escrowFactory.getEscrowCountByOwner(owner.address)).to.equal(
        0n,
      );
      expect(
        await escrowFactory.getEscrowCountByWorker(worker.address),
      ).to.equal(0n);
    });

    it("Should revert when consulting escrows of an owner or worker since there are none", async function () {
      const { escrowFactory, owner, worker } = await networkHelpers.loadFixture(
        deployEscrowFactoryFixture,
      );

      await expect(escrowFactory.escrowsByOwner(owner.address, 0)).to.revert(
        ethers,
      ); // No importa el error
      await expect(escrowFactory.escrowsByOwner(worker.address, 0)).to.revert(
        ethers,
      ); // No importa el error
    });
  });

  describe("createEscrow", function () {
    describe("successful creation", function () {
      it("Should add the escrow to the escrows array", async function () {
        const { escrowFactory, escrowAddress } =
          await deployAndCreateDefaultEscrow();

        expect(await escrowFactory.getEscrowCount()).to.equal(1n);
        expect(await escrowFactory.allEscrows(0)).to.equal(escrowAddress);
      });

      it("Should register the escrow for its owner", async function () {
        const { escrowFactory, owner, escrowAddress } =
          await deployAndCreateDefaultEscrow();

        expect(
          await escrowFactory.getEscrowCountByOwner(owner.address),
        ).to.equal(1n);

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

      it("Should not register the owner as worker and viceversa", async function () {
        const { escrowFactory, owner, worker } =
          await deployAndCreateDefaultEscrow();

        expect(
          await escrowFactory.getEscrowCountByWorker(owner.address),
        ).to.equal(0n);
        expect(
          await escrowFactory.getEscrowCountByOwner(worker.address),
        ).to.equal(0n);
      });

      it("Should transfer all provided ETH to the new escrow", async function () {
        const { escrowFactory, escrowAddress, amount } =
          await deployAndCreateDefaultEscrow();

        const factoryAddress = await escrowFactory.getAddress();

        expect(await ethers.provider.getBalance(factoryAddress)).to.equal(0n);

        expect(await ethers.provider.getBalance(escrowAddress)).to.equal(
          amount,
        );
      });

      it("Should emit EscrowCreated with the escrow creation data", async function () {
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
    });

    describe("multiple escrows", function () {
      it("Should allow to create multiple escrows", async function () {
        const { escrowFactory, owner, worker, escrowAddress } =
          await deployAndCreateDefaultEscrow();

        await createDefaultEscrow(escrowFactory, owner, worker); // Mismo owner y factory

        expect(
          await escrowFactory.getEscrowCountByOwner(owner.address),
        ).to.equal(2n);
        expect(
          await escrowFactory.getEscrowCountByWorker(worker.address),
        ).to.equal(2n);
        expect(await escrowFactory.getEscrowCount()).to.equal(2n);

        const secondEscrowAddress = await escrowFactory.escrowsByOwner(
          owner.address,
          1,
        );
        expect(escrowAddress).not.to.equal(secondEscrowAddress);

        expect(await escrowFactory.escrowsByOwner(owner.address, 0)).to.equal(
          escrowAddress,
        );
        expect(await escrowFactory.escrowsByWorker(worker.address, 0)).to.equal(
          escrowAddress,
        );
        expect(await escrowFactory.escrowsByOwner(owner.address, 1)).to.equal(
          secondEscrowAddress,
        );
        expect(await escrowFactory.escrowsByWorker(worker.address, 1)).to.equal(
          secondEscrowAddress,
        );
      });

      // TODO - ACOMODAR NOMBRE
      it("Should independently save escrows for the same address as worker and owner", async function () {
        const { escrowFactory, owner, worker, otherAccount } =
          await deployAndCreateDefaultEscrow();

        const amount = ethers.parseEther("2");
        const durationDays = 15n;
        const title = "Escrow de prueba";

        await (
          await escrowFactory
            .connect(otherAccount)
            .createEscrow(owner.address, durationDays, title, {
              value: amount,
            })
        ).wait(); // Owner: otherAccount.address - Worker: owner.address

        expect(
          await escrowFactory.getEscrowCountByOwner(owner.address),
        ).to.equal(1n); // El default
        expect(
          await escrowFactory.getEscrowCountByWorker(worker.address),
        ).to.equal(1); // El default

        expect(
          await escrowFactory.getEscrowCountByOwner(otherAccount.address),
        ).to.equal(1n); // El segundo escrow creado (Owner: otherAccount.address)
        expect(
          await escrowFactory.getEscrowCountByWorker(owner.address),
        ).to.equal(1); // El segundo escrow creado (Worker: owner.address)
      });
    });

    describe("failures", function () {
      it("Should revert the whole creation when Escrow construction fails", async function () {
        const { escrowFactory, owner, worker } =
          await networkHelpers.loadFixture(deployEscrowFactoryFixture);

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

        expect(
          await escrowFactory.getEscrowCountByOwner(owner.address),
        ).to.equal(0n);
        expect(
          await escrowFactory.getEscrowCountByWorker(worker.address),
        ).to.equal(0n);
        expect(await escrowFactory.getEscrowCount()).to.equal(0n);
      });
    });

    describe("events", function () {
      it("Should keep events consistent with the registered escrows", async function () {
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

        const ownerFilter = escrowFactory.filters.EscrowCreated(owner.address); // El resto de parametros no interesan
        const workerFilter = escrowFactory.filters.EscrowCreated(
          undefined, // No interesa la dirección del owner
          worker.address,
        );

        const ownerEvents = await escrowFactory.queryFilter(
          ownerFilter,
          deploymentBlockNumber,
          "latest",
        );
        const workerEvents = await escrowFactory.queryFilter(
          workerFilter,
          deploymentBlockNumber,
          "latest",
        );

        expect(await escrowFactory.getEscrowCountByOwner(owner.address))
          .to.equal(BigInt(ownerEvents.length))
          .to.equal(2n);
        expect(await escrowFactory.getEscrowCountByWorker(worker.address))
          .to.equal(BigInt(workerEvents.length))
          .to.equal(1n); // Uno de los escrows tiene como worker a otherAccount

        for (let index = 0; index < ownerEvents.length; index++) {
          const registeredAddress = await escrowFactory.escrowsByOwner(
            owner.address,
            index,
          );

          expect(ownerEvents[index].args.escrowAddress).to.equal(
            registeredAddress,
          );
        }

        // Solo hay un escrow del worker
        const registeredAddress = await escrowFactory.escrowsByWorker(
          worker.address,
          0,
        );
        expect(workerEvents[0].args.escrowAddress).to.equal(registeredAddress);
      });

      it("Should match emitted amounts with stored escrow amounts", async function () {
        const { escrowFactory, owner, worker } =
          await networkHelpers.loadFixture(deployEscrowFactoryFixture);

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
});
