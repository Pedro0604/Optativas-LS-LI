import { expect } from "chai";
import {
  networkHelpers,
  ethers,
  deployEscrowFactoryWithDefaultEscrowFixture,
  EscrowState,
  sendCreateEscrow,
  getUtf8ByteLength,
  SECONDS_PER_DAY,
  createEscrow,
  getEscrowEventName,
  EscrowErrors,
} from "./utils.js";

type TitleCase = {
  description: string;
  buildTitle: (maxLength: bigint) => string;
  expectedLength: (maxLength: bigint) => bigint;
};

const validTitleCases: TitleCase[] = [
  {
    description: "one ASCII byte",
    buildTitle: () => "a",
    expectedLength: () => 1n,
  },
  {
    description: "MAX_TITLE_LENGTH ASCII bytes",
    buildTitle: (maxLength) => "a".repeat(Number(maxLength)),
    expectedLength: (maxLength) => maxLength,
  },
  {
    description: "MAX_TITLE_LENGTH bytes using an accented character",
    buildTitle: (maxLength) => "a".repeat(Number(maxLength - 2n)) + "á",
    expectedLength: (maxLength) => maxLength,
  },
  {
    description: "MAX_TITLE_LENGTH bytes using an emoji",
    buildTitle: (maxLength) => "a".repeat(Number(maxLength - 4n)) + "😎",
    expectedLength: (maxLength) => maxLength,
  },
  {
    description: "MAX_TITLE_LENGTH bytes using spaces",
    buildTitle: (maxLength) => " ".repeat(Number(maxLength)),
    expectedLength: (maxLength) => maxLength,
  },
  {
    description: "MAX_TITLE_LENGTH bytes with a \\n",
    buildTitle: (maxLength) =>
      "a".repeat(Number(maxLength - 5n)) + "\n" + "a".repeat(4),
    expectedLength: (maxLength) => maxLength,
  },
];

const tooLongTitleCases: TitleCase[] = [
  {
    description: "ASCII",
    buildTitle: (maxLength) => "a".repeat(Number(maxLength + 1n)),
    expectedLength: (maxLength) => maxLength + 1n,
  },
  {
    description: "an accented character",
    buildTitle: (maxLength) => "a".repeat(Number(maxLength - 1n)) + "á",
    expectedLength: (maxLength) => maxLength + 1n,
  },
  {
    description: "an emoji",
    buildTitle: (maxLength) => "a".repeat(Number(maxLength - 3n)) + "😎",
    expectedLength: (maxLength) => maxLength + 1n,
  },
];

describe("Escrow", function () {
  describe("constructor through EscrowFactory.createEscrow", function () {
    describe("successful creation", function () {
      it("Should correctly save the values and ETH balance of an Escrow", async function () {
        const {
          owner,
          worker,
          escrowAddress,
          escrow,
          amountInWei,
          title,
          receipt,
          durationDays,
        } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        expect(await escrow.owner()).to.equal(owner.address);
        expect(await escrow.worker()).to.equal(worker.address);
        expect(await escrow.amount()).to.equal(amountInWei);
        expect(await escrow.title()).to.equal(title);
        expect(await escrow.state()).to.equal(EscrowState.Funded);
        expect(await ethers.provider.getBalance(escrowAddress)).to.equal(
          amountInWei,
        );

        const escrowDeploymentBlock = await receipt.getBlock();
        const expectedDeadline =
          BigInt(escrowDeploymentBlock.timestamp) +
          BigInt(durationDays) * SECONDS_PER_DAY;
        expect(await escrow.deadline()).to.equal(expectedDeadline);
      });

      describe("valid title length", function () {
        for (const testCase of validTitleCases) {
          it(`Should accept ${testCase.description}`, async function () {
            const { escrowFactory, owner, worker, escrow } =
              await networkHelpers.loadFixture(
                deployEscrowFactoryWithDefaultEscrowFixture,
              );

            const maxLength = await escrow.MAX_TITLE_LENGTH();
            const title = testCase.buildTitle(maxLength);
            const expectedLength = testCase.expectedLength(maxLength);
            expect(getUtf8ByteLength(title)).to.equal(expectedLength);

            // Como no debe fallar, se puede usar createEscrow directamente, y luego expect(transaction)
            const { escrow: createdEscrow, transaction } = await createEscrow({
              escrowFactory,
              owner,
              workerAddress: worker.address,
              title,
            });

            await expect(transaction).to.not.revert(ethers);
            expect(await createdEscrow.title()).to.equal(title);
          });
        }
      });
    });

    describe("failures", function () {
      // En los casos de fallo se usa el fixture deployEscrowFactoryWithDefaultEscrowFixture
      // así se tiene acceso a `escrow` para poder acceder a los errores y constantes definidos
      // en el contrato

      // Además, se usa obligatoriamente sendCreateEscrow porque no lanza excepción si hay revert
      // al esperarse que se mine el bloque solo dentro del expect().to.revert()
      it("Should revert when no eth is provided", async function () {
        const { escrowFactory, owner, worker, escrow } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner,
            workerAddress: worker.address,
            amountInEth: 0,
          }),
        ).to.be.revertedWithCustomError(escrow, EscrowErrors.NoEthProvided);
      });

      it("Should revert when the worker address is address(0)", async function () {
        const { escrowFactory, owner, escrow } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner,
            workerAddress: ethers.ZeroAddress,
          }),
        ).to.be.revertedWithCustomError(escrow, EscrowErrors.ZeroAddress);
      });

      it("Should revert when owner is the same account as worker", async function () {
        const { escrowFactory, owner, escrow } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner,
            workerAddress: owner.address,
          }),
        ).to.be.revertedWithCustomError(
          escrow,
          EscrowErrors.CannotHireYourself,
        );
      });

      it("Should revert when durationDays is zero", async function () {
        const { escrowFactory, owner, worker, escrow } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner,
            workerAddress: worker.address,
            durationDays: 0n,
          }),
        ).to.be.revertedWithCustomError(escrow, EscrowErrors.ZeroDuration);
      });

      it("Should revert when title is empty", async function () {
        const { escrowFactory, owner, worker, escrow } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner,
            workerAddress: worker.address,
            title: "",
          }),
        ).to.be.revertedWithCustomError(escrow, EscrowErrors.EmptyTitle);
      });

      describe("title exceeding MAX_TITLE_LENGTH", function () {
        for (const testCase of tooLongTitleCases) {
          it(`Should revert when title length exceeds MAX_TITLE_LENGTH using ${testCase.description}`, async function () {
            const { escrowFactory, owner, worker, escrow } =
              await networkHelpers.loadFixture(
                deployEscrowFactoryWithDefaultEscrowFixture,
              );

            const maxLength = await escrow.MAX_TITLE_LENGTH();
            const title = testCase.buildTitle(maxLength);
            const expectedLength = testCase.expectedLength(maxLength);
            const titleLength = getUtf8ByteLength(title);
            expect(titleLength).to.equal(expectedLength);

            await expect(
              sendCreateEscrow({
                escrowFactory,
                owner,
                workerAddress: worker.address,
                title,
              }),
            )
              .to.be.revertedWithCustomError(escrow, EscrowErrors.TitleTooLong)
              .withArgs(titleLength, maxLength);
          });
        }
      });
    });
  });

  describe("accept", function () {
    describe("succesful acceptance", function () {
      const acceptedEvent = getEscrowEventName(EscrowState.Accepted);
      it(`Should emit the ${acceptedEvent} event and change its state to Accepted`, async function () {
        const { escrow, worker } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        await expect(escrow.connect(worker).accept())
          .to.emit(escrow, acceptedEvent)
          .withArgs();
        expect(await escrow.state()).to.equal(EscrowState.Accepted);
      });
    });

    describe("failing acceptance", function () {
      it(`Should revert when sender is not the worker`, async function () {
        const { escrow, owner, otherAccount } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        await expect(escrow.connect(owner).accept())
          .to.revertedWithCustomError(escrow, EscrowErrors.OnlyWorkerAllowed)
          .withArgs();
        expect(await escrow.state()).to.equal(EscrowState.Funded);

        await expect(escrow.connect(otherAccount).accept())
          .to.revertedWithCustomError(escrow, EscrowErrors.OnlyWorkerAllowed)
          .withArgs();
        expect(await escrow.state()).to.equal(EscrowState.Funded);
      });

      it(`Should revert when the escrow is not in State.Accepted`, async function () {
        const { escrow, worker } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        await escrow.connect(worker).accept();

        await expect(escrow.connect(worker).accept())
          .to.revertedWithCustomError(escrow, EscrowErrors.InvalidState)
          .withArgs(EscrowState.Accepted, EscrowState.Funded);
      });
    });
  });
});
