import { expect } from "chai";
import { getUtf8ByteLength } from "../helpers/utils.js";
import { State } from "../constants/State.js";
import { Error } from "../constants/Error.js";
import { ethers, networkHelpers } from "../helpers/globals.js";
import { defaultEscrowFixture } from "../helpers/fixtures.js";
import { createEscrow, sendCreateEscrow } from "../helpers/createEscrow.js";
import { tooLongStringCases, validStringCases } from "../cases/title.js";

describe("Escrow.constructor through EscrowFactory.createEscrow", function () {
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
      } = await networkHelpers.loadFixture(defaultEscrowFixture);

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
      expect(await escrow.arbitrationDuration()).to.equal(arbitrationDuration);

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
      for (const testCase of validStringCases) {
        it(`Should accept ${testCase.description}`, async function () {
          const { escrowFactory, owner, worker, arbiter, escrow } =
            await networkHelpers.loadFixture(defaultEscrowFixture);

          const maxLength = await escrow.MAX_TITLE_LENGTH();
          const title = testCase.buildValue(maxLength);
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
    // En los casos de fallo se usa el fixture defaultEscrowFixture
    // así se tiene acceso a `escrow` para poder acceder a los errores y constantes definidos
    // en el contrato

    // Además, se usa obligatoriamente sendCreateEscrow porque no lanza excepción si hay revert
    // al esperarse que se mine el bloque solo dentro del expect().to.revert()
    it("Should revert when no eth is provided", async function () {
      const { escrowFactory, owner, worker, arbiter, escrow } =
        await networkHelpers.loadFixture(defaultEscrowFixture);

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
        await networkHelpers.loadFixture(defaultEscrowFixture);

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
        await networkHelpers.loadFixture(defaultEscrowFixture);

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
        await networkHelpers.loadFixture(defaultEscrowFixture);

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
        await networkHelpers.loadFixture(defaultEscrowFixture);

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
        await networkHelpers.loadFixture(defaultEscrowFixture);

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
      for (const testCase of tooLongStringCases) {
        it(`Should revert when title length exceeds MAX_TITLE_LENGTH using ${testCase.description}`, async function () {
          const { escrowFactory, owner, worker, arbiter, escrow } =
            await networkHelpers.loadFixture(defaultEscrowFixture);

          const maxLength = await escrow.MAX_TITLE_LENGTH();
          const title = testCase.buildValue(maxLength);
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
