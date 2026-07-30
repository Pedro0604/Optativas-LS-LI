import { expect } from "chai";
import { getUtf8ByteLength } from "./helpers/utils.js";
import { State } from "./constants/State.js";
import { Error } from "./constants/Error.js";
import { Event } from "./constants/Event.js";
import { ethers, networkHelpers } from "./helpers/globals.js";
import { deployEscrowFactoryWithDefaultEscrowFixture } from "./helpers/fixtures.js";
import { createEscrow, sendCreateEscrow } from "./helpers/createEscrow.js";

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
      it("Should set a correct initial state", async function () {
        const {
          owner,
          worker,
          arbiter,
          escrowAddress,
          escrow,
          amountInWei,
          title,
          receipt,
          acceptanceDuration,
          submissionDuration,
          reviewDuration,
          arbitrationDuration,
        } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        // Addresses ok
        expect(await escrow.owner()).to.equal(owner.address);
        expect(await escrow.worker()).to.equal(worker.address);
        expect(await escrow.arbiter()).to.equal(arbiter.address);

        // State ok
        expect(await escrow.state()).to.equal(State.PendingAcceptance);

        // Strings ok
        expect(await escrow.title()).to.equal(title);
        expect(await escrow.submissionReference()).to.equal("");
        expect(await escrow.disputeReason()).to.equal("");
        expect(await escrow.resolutionReason()).to.equal("");

        // ETH ok
        expect(await escrow.amount()).to.equal(amountInWei);
        expect(await ethers.provider.getBalance(escrowAddress)).to.equal(
          amountInWei,
        );

        // Durations ok
        expect(await escrow.submissionDuration()).to.equal(submissionDuration);
        expect(await escrow.reviewDuration()).to.equal(reviewDuration);
        expect(await escrow.arbitrationDuration()).to.equal(
          arbitrationDuration,
        );

        // Non set deadlines ok
        expect(await escrow.submissionDeadline()).to.equal(0n);
        expect(await escrow.submissionExpired()).to.be.false;
        expect(await escrow.reviewDeadline()).to.equal(0n);
        expect(await escrow.reviewExpired()).to.be.false;
        expect(await escrow.arbitrationDeadline()).to.equal(0n);
        expect(await escrow.arbitrationExpired()).to.be.false;

        // Acceptance deadline ok
        const escrowDeploymentBlock = await receipt.getBlock();
        const expectedAcceptanceDeadline =
          BigInt(escrowDeploymentBlock.timestamp) + acceptanceDuration;
        expect(await escrow.acceptanceDeadline()).to.equal(
          expectedAcceptanceDeadline,
        );
        expect(await escrow.acceptanceExpired()).to.be.false;
      });

      describe("valid title length", function () {
        for (const testCase of validTitleCases) {
          it(`Should accept ${testCase.description}`, async function () {
            const { escrowFactory, owner, worker, arbiter, escrow } =
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
              arbiterAddress: arbiter.address,
              title,
            });

            await expect(transaction).to.not.revert(ethers);
            expect(await createdEscrow.title()).to.equal(title);
          });
        }
      });
    });

    describe("failing creation", function () {
      // En los casos de fallo se usa el fixture deployEscrowFactoryWithDefaultEscrowFixture
      // así se tiene acceso a `escrow` para poder acceder a los errores y constantes definidos
      // en el contrato

      // Además, se usa obligatoriamente sendCreateEscrow porque no lanza excepción si hay revert
      // al esperarse que se mine el bloque solo dentro del expect().to.revert()
      it("Should revert when no eth is provided", async function () {
        const { escrowFactory, owner, worker, arbiter, escrow } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner,
            workerAddress: worker.address,
            arbiterAddress: arbiter.address,
            amountInEth: 0n,
          }),
        ).to.be.revertedWithCustomError(escrow, Error.NoEthProvided);
      });

      it("Should revert when the worker or arbiter address are address(0)", async function () {
        const { escrowFactory, owner, worker, arbiter, escrow } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner,
            workerAddress: ethers.ZeroAddress,
            arbiterAddress: arbiter.address,
          }),
        ).to.be.revertedWithCustomError(escrow, Error.ZeroAddress);

        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner,
            workerAddress: worker.address,
            arbiterAddress: ethers.ZeroAddress,
          }),
        ).to.be.revertedWithCustomError(escrow, Error.ZeroAddress);
      });

      it("Should revert when owner is the same account as worker", async function () {
        const { escrowFactory, owner, arbiter, escrow } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner,
            workerAddress: owner.address,
            arbiterAddress: arbiter.address,
          }),
        ).to.be.revertedWithCustomError(escrow, Error.CannotHireYourself);
      });

      it("Should revert when owner or worker are the same account as arbiter", async function () {
        const { escrowFactory, owner, worker, escrow } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner,
            workerAddress: worker.address,
            arbiterAddress: owner.address,
          }),
        ).to.be.revertedWithCustomError(escrow, Error.ArbiterCannotParticipate);

        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner,
            workerAddress: worker.address,
            arbiterAddress: worker.address,
          }),
        ).to.be.revertedWithCustomError(escrow, Error.ArbiterCannotParticipate);
      });

      it("Should revert when any duration is zero", async function () {
        const { escrowFactory, owner, worker, arbiter, escrow } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        const durationKeys = [
          "acceptanceDuration",
          "submissionDuration",
          "reviewDuration",
          "arbitrationDuration",
        ];

        for (const durationKey of durationKeys) {
          await expect(
            sendCreateEscrow({
              escrowFactory,
              owner,
              workerAddress: worker.address,
              arbiterAddress: arbiter.address,
              [durationKey]: 0n,
            }),
          ).to.be.revertedWithCustomError(escrow, Error.ZeroDuration);
        }
      });

      it("Should revert when title is empty", async function () {
        const { escrowFactory, owner, worker, arbiter, escrow } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner,
            workerAddress: worker.address,
            arbiterAddress: arbiter.address,
            title: "",
          }),
        ).to.be.revertedWithCustomError(escrow, Error.EmptyString);
      });

      describe("title exceeding MAX_TITLE_LENGTH", function () {
        for (const testCase of tooLongTitleCases) {
          it(`Should revert when title length exceeds MAX_TITLE_LENGTH using ${testCase.description}`, async function () {
            const { escrowFactory, owner, worker, arbiter, escrow } =
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
                arbiterAddress: arbiter.address,
                title,
              }),
            )
              .to.be.revertedWithCustomError(escrow, Error.StringTooLong)
              .withArgs(titleLength, maxLength);
          });
        }
      });
    });
  });

  describe("acceptEscrow", function () {
    describe("successful acceptance", function () {
      it(`Should emit the ${Event.EscrowAccepted} event, change its state to PendingSubmission and set the submissionDeadline`, async function () {
        const { escrow, worker, submissionDuration } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        const latestTimestamp = await networkHelpers.time.latest();
        const nextBlockTimestamp = latestTimestamp + 12;
        await networkHelpers.time.setNextBlockTimestamp(nextBlockTimestamp);

        const expectedSubmissionDeadline =
          BigInt(nextBlockTimestamp) + submissionDuration;

        await expect(escrow.connect(worker).acceptEscrow())
          .to.emit(escrow, Event.EscrowAccepted)
          .withArgs(expectedSubmissionDeadline);

        expect(await escrow.state()).to.equal(State.PendingSubmission);
        expect(await escrow.submissionDeadline()).to.equal(
          expectedSubmissionDeadline,
        );
      });

      it(`Should not revert at acceptanceDeadline - 1`, async function () {
        const { escrow, worker } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        await networkHelpers.time.setNextBlockTimestamp(
          (await escrow.acceptanceDeadline()) - 1n,
        );
        await expect(escrow.connect(worker).acceptEscrow()).to.not.revert(
          ethers,
        );
      });
    });

    describe("failing acceptance", function () {
      it(`Should revert when sender is not the worker`, async function () {
        const { escrow, owner, arbiter } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        await expect(escrow.connect(owner).acceptEscrow())
          .to.be.revertedWithCustomError(escrow, Error.OnlyWorkerAllowed)
          .withArgs();

        await expect(escrow.connect(arbiter).acceptEscrow())
          .to.be.revertedWithCustomError(escrow, Error.OnlyWorkerAllowed)
          .withArgs();
      });

      it(`Should revert when the escrow is not in State.PendingAcceptance`, async function () {
        const { escrow, worker } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        await escrow.connect(worker).acceptEscrow();

        await expect(escrow.connect(worker).acceptEscrow())
          .to.be.revertedWithCustomError(escrow, Error.InvalidState)
          .withArgs(State.PendingSubmission, State.PendingAcceptance);
      });

      it(`Should revert at acceptanceDeadline`, async function () {
        const { escrow, worker } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        const acceptanceDeadline = await escrow.acceptanceDeadline();
        await networkHelpers.time.setNextBlockTimestamp(acceptanceDeadline);
        await expect(escrow.connect(worker).acceptEscrow())
          .to.be.revertedWithCustomError(escrow, Error.DeadlineAlreadyExpired)
          .withArgs(acceptanceDeadline);
      });
    });
  });

  describe("acceptanceExpired", function () {
    it(`Should correctly calculate acceptanceExpired around acceptanceDeadline`, async function () {
      const { escrow } = await networkHelpers.loadFixture(
        deployEscrowFactoryWithDefaultEscrowFixture,
      );

      const acceptanceDeadline = await escrow.acceptanceDeadline();

      await networkHelpers.time.increaseTo(acceptanceDeadline - 1n);
      expect(await escrow.acceptanceExpired()).to.be.false;

      await networkHelpers.time.increaseTo(acceptanceDeadline);
      expect(await escrow.acceptanceExpired()).to.be.true;
    });
  });

  describe("expireAcceptance", function () {
    describe("successful expiration", function () {
      it(`Should emit the ${Event.AcceptanceExpired} event, change its state to AcceptanceExpired and credit the full amount to the owner`, async function () {
        const { escrow, owner, amountInWei } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        await networkHelpers.time.setNextBlockTimestamp(
          await escrow.acceptanceDeadline(),
        );
        await expect(escrow.connect(owner).expireAcceptance())
          .to.emit(escrow, Event.AcceptanceExpired)
          .withArgs();

        expect(await escrow.state()).to.equal(State.AcceptanceExpired);
        expect(await escrow.submissionDeadline()).to.equal(0n);
        expect(await escrow.pendingWithdrawals(owner)).to.equal(amountInWei);
      });

      it(`Should allow being called from accounts other than the owner`, async function () {
        const { escrow, worker } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        await networkHelpers.time.setNextBlockTimestamp(
          await escrow.acceptanceDeadline(),
        );
        await expect(escrow.connect(worker).expireAcceptance()).to.not.revert(
          ethers,
        );
      });
    });

    describe("failing expiration", function () {
      it(`Should revert when the escrow is not in State.PendingAcceptance`, async function () {
        const { escrow, owner } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        await networkHelpers.time.setNextBlockTimestamp(
          await escrow.acceptanceDeadline(),
        );
        await escrow.connect(owner).expireAcceptance();

        await expect(escrow.connect(owner).expireAcceptance())
          .to.be.revertedWithCustomError(escrow, Error.InvalidState)
          .withArgs(State.AcceptanceExpired, State.PendingAcceptance);
      });

      it(`Should revert at acceptanceDeadline - 1`, async function () {
        const { escrow, owner } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        const acceptanceDeadline = await escrow.acceptanceDeadline();
        await networkHelpers.time.setNextBlockTimestamp(
          acceptanceDeadline - 1n,
        );
        await expect(escrow.connect(owner).expireAcceptance())
          .to.be.revertedWithCustomError(escrow, Error.DeadlineNotExpiredYet)
          .withArgs(acceptanceDeadline);
      });
    });
  });

  describe("cancelEscrow", function () {
    describe("successful cancelation", function () {
      it(`Should emit the ${Event.EscrowCancelled} event, change its state to EscrowCancelled and credit the full amount to the owner`, async function () {
        const { escrow, owner, amountInWei } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        await expect(escrow.connect(owner).cancelEscrow())
          .to.emit(escrow, Event.EscrowCancelled)
          .withArgs();

        expect(await escrow.state()).to.equal(State.EscrowCancelled);
        expect(await escrow.submissionDeadline()).to.equal(0n);
        expect(await escrow.pendingWithdrawals(owner)).to.equal(amountInWei);
      });

      it(`Should not revert at acceptanceDeadline - 1`, async function () {
        const { escrow, owner } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        await networkHelpers.time.setNextBlockTimestamp(
          (await escrow.acceptanceDeadline()) - 1n,
        );
        await expect(escrow.connect(owner).cancelEscrow()).to.not.revert(
          ethers,
        );
      });
    });

    describe("failing cancelation", function () {
      it(`Should revert when sender is not the owner`, async function () {
        const { escrow, worker, arbiter } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        await expect(escrow.connect(worker).cancelEscrow())
          .to.be.revertedWithCustomError(escrow, Error.OnlyOwnerAllowed)
          .withArgs();

        await expect(escrow.connect(arbiter).cancelEscrow())
          .to.be.revertedWithCustomError(escrow, Error.OnlyOwnerAllowed)
          .withArgs();
      });

      it(`Should revert when the escrow is not in State.PendingAcceptance`, async function () {
        const { escrow, owner } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        await escrow.connect(owner).cancelEscrow();

        await expect(escrow.connect(owner).cancelEscrow())
          .to.be.revertedWithCustomError(escrow, Error.InvalidState)
          .withArgs(State.EscrowCancelled, State.PendingAcceptance);
      });

      it(`Should revert at acceptanceDeadline`, async function () {
        const { escrow, owner } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        const acceptanceDeadline = await escrow.acceptanceDeadline();
        await networkHelpers.time.setNextBlockTimestamp(acceptanceDeadline);
        await expect(escrow.connect(owner).cancelEscrow())
          .to.be.revertedWithCustomError(escrow, Error.DeadlineAlreadyExpired)
          .withArgs(acceptanceDeadline);
      });
    });
  });
});
