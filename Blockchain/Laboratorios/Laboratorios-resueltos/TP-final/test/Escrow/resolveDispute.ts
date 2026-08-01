import { expect } from "chai";
import { State } from "../constants/State.js";
import { Event } from "../constants/Event.js";
import { Error as EscrowError } from "../constants/Error.js";
import { ethers, networkHelpers } from "../helpers/globals.js";
import { pendingArbitrationFixture } from "../helpers/fixtures.js";
import {
  setNextBlockAfter,
  setNextBlockAt,
  setNextBlockBefore,
} from "../helpers/time.js";
import { tooLongStringCases, validStringCases } from "../cases/title.js";
import {
  getUtf8ByteLength,
  getWorkerAndOwnerAmounts,
} from "../helpers/utils.js";
import { DEFAULT_RESOLUTION_REASON } from "../helpers/transitions.js";

describe("Escrow.resolveDispute", function () {
  describe("successful resolution", function () {
    it(`Should emit the ${Event.DisputeResolved} event, change its state to DisputeResolved, set resolutionReason and match owner and worker pending balance`, async function () {
      const { escrow, owner, worker, arbiter, amountInWei } =
        await networkHelpers.loadFixture(pendingArbitrationFixture);

      const [workerAmount, ownerAmount] = getWorkerAndOwnerAmounts(
        amountInWei,
        60n,
      );
      await expect(
        escrow
          .connect(arbiter)
          .resolveDispute(workerAmount, DEFAULT_RESOLUTION_REASON),
      )
        .to.emit(escrow, Event.DisputeResolved)
        .withArgs(ownerAmount, workerAmount);

      expect(await escrow.state()).to.equal(State.DisputeResolved);
      expect(await escrow.resolutionReason()).to.equal(
        DEFAULT_RESOLUTION_REASON,
      );
      expect(await escrow.pendingWithdrawals(owner)).to.equal(ownerAmount);
      expect(await escrow.pendingWithdrawals(worker)).to.equal(workerAmount);
    });

    it(`Should not revert when the workerAmount is 0`, async function () {
      const { escrow, arbiter } = await networkHelpers.loadFixture(
        pendingArbitrationFixture,
      );

      await expect(
        escrow.connect(arbiter).resolveDispute(0n, DEFAULT_RESOLUTION_REASON),
      ).to.not.revert(ethers);
    });

    it(`Should not revert when the workerAmount is amountInWei`, async function () {
      const { escrow, arbiter, amountInWei } = await networkHelpers.loadFixture(
        pendingArbitrationFixture,
      );

      await expect(
        escrow
          .connect(arbiter)
          .resolveDispute(amountInWei, DEFAULT_RESOLUTION_REASON),
      ).to.not.revert(ethers);
    });

    it(`Should not revert at arbitrationDeadline - 1`, async function () {
      const { escrow, arbiter, amountInWei } = await networkHelpers.loadFixture(
        pendingArbitrationFixture,
      );

      const [workerAmount] = getWorkerAndOwnerAmounts(amountInWei);
      await setNextBlockBefore(escrow.arbitrationDeadline());
      await expect(
        escrow
          .connect(arbiter)
          .resolveDispute(workerAmount, DEFAULT_RESOLUTION_REASON),
      ).to.not.revert(ethers);
    });

    describe("valid resolutionReason length", function () {
      for (const testCase of validStringCases) {
        it(`Should accept ${testCase.description}`, async function () {
          const { escrow, arbiter, amountInWei } =
            await networkHelpers.loadFixture(pendingArbitrationFixture);

          const [workerAmount] = getWorkerAndOwnerAmounts(amountInWei);

          const maxLength = await escrow.MAX_RESOLUTION_REASON_LENGTH();
          const reason = testCase.buildValue(maxLength);
          const expectedLength = testCase.expectedLength(maxLength);

          expect(getUtf8ByteLength(reason)).to.equal(expectedLength);
          await expect(
            escrow.connect(arbiter).resolveDispute(workerAmount, reason),
          ).to.not.revert(ethers);
          expect(await escrow.resolutionReason()).to.equal(reason);
        });
      }
    });
  });

  describe("failing resolution", function () {
    it(`Should revert when sender is not the arbiter`, async function () {
      const { escrow, owner, worker, amountInWei } =
        await networkHelpers.loadFixture(pendingArbitrationFixture);

      const [workerAmount] = getWorkerAndOwnerAmounts(amountInWei);

      await expect(
        escrow
          .connect(owner)
          .resolveDispute(workerAmount, DEFAULT_RESOLUTION_REASON),
      )
        .to.be.revertedWithCustomError(escrow, EscrowError.OnlyArbiterAllowed)
        .withArgs();

      await expect(
        escrow
          .connect(worker)
          .resolveDispute(workerAmount, DEFAULT_RESOLUTION_REASON),
      )
        .to.be.revertedWithCustomError(escrow, EscrowError.OnlyArbiterAllowed)
        .withArgs();
    });

    it(`Should revert when the escrow is not in State.PendingArbitration`, async function () {
      const { escrow, arbiter, amountInWei } = await networkHelpers.loadFixture(
        pendingArbitrationFixture,
      );

      const [workerAmount] = getWorkerAndOwnerAmounts(amountInWei);

      await escrow
        .connect(arbiter)
        .resolveDispute(workerAmount, DEFAULT_RESOLUTION_REASON);

      await expect(
        escrow
          .connect(arbiter)
          .resolveDispute(workerAmount, DEFAULT_RESOLUTION_REASON),
      )
        .to.be.revertedWithCustomError(escrow, EscrowError.InvalidState)
        .withArgs(State.DisputeResolved, State.PendingArbitration);
    });

    it(`Should revert when the workerAmount is amountInWei + 1`, async function () {
      const { escrow, arbiter, amountInWei } = await networkHelpers.loadFixture(
        pendingArbitrationFixture,
      );

      await expect(
        escrow
          .connect(arbiter)
          .resolveDispute(amountInWei + 1n, DEFAULT_RESOLUTION_REASON),
      )
        .to.be.revertedWithCustomError(
          escrow,
          EscrowError.WorkerAmountExceedsEscrow,
        )
        .withArgs(amountInWei + 1n, amountInWei);
    });

    it(`Should revert at arbitrationDeadline`, async function () {
      const { escrow, arbiter, amountInWei } = await networkHelpers.loadFixture(
        pendingArbitrationFixture,
      );

      const [workerAmount] = getWorkerAndOwnerAmounts(amountInWei);

      const arbitrationDeadline = await setNextBlockAt(
        escrow.arbitrationDeadline(),
      );
      await expect(
        escrow
          .connect(arbiter)
          .resolveDispute(workerAmount, DEFAULT_RESOLUTION_REASON),
      )
        .to.be.revertedWithCustomError(
          escrow,
          EscrowError.DeadlineAlreadyExpired,
        )
        .withArgs(arbitrationDeadline);
    });

    it(`Should revert at arbitrationDeadline + 1`, async function () {
      const { escrow, arbiter, amountInWei } = await networkHelpers.loadFixture(
        pendingArbitrationFixture,
      );

      const [workerAmount] = getWorkerAndOwnerAmounts(amountInWei);

      const arbitrationDeadline = await setNextBlockAfter(
        escrow.arbitrationDeadline(),
      );
      await expect(
        escrow
          .connect(arbiter)
          .resolveDispute(workerAmount, DEFAULT_RESOLUTION_REASON),
      )
        .to.be.revertedWithCustomError(
          escrow,
          EscrowError.DeadlineAlreadyExpired,
        )
        .withArgs(arbitrationDeadline);
    });

    it("Should revert when resolutionReason is empty", async function () {
      const { escrow, arbiter, amountInWei } = await networkHelpers.loadFixture(
        pendingArbitrationFixture,
      );

      const [workerAmount] = getWorkerAndOwnerAmounts(amountInWei);

      await expect(
        escrow.connect(arbiter).resolveDispute(workerAmount, ""),
      ).to.be.revertedWithCustomError(escrow, EscrowError.EmptyString);
    });

    describe("resolutionReason exceeding MAX_RESOLUTION_REASON_LENGTH", function () {
      for (const testCase of tooLongStringCases) {
        it(`Should revert when resolutionReason length exceeds MAX_RESOLUTION_REASON_LENGTH using ${testCase.description}`, async function () {
          const { escrow, arbiter, amountInWei } =
            await networkHelpers.loadFixture(pendingArbitrationFixture);

          const [workerAmount] = getWorkerAndOwnerAmounts(amountInWei);

          const maxLength = await escrow.MAX_RESOLUTION_REASON_LENGTH();
          const reason = testCase.buildValue(maxLength);
          const expectedLength = testCase.expectedLength(maxLength);
          const reasonLength = getUtf8ByteLength(reason);
          expect(reasonLength).to.equal(expectedLength);

          await expect(
            escrow.connect(arbiter).resolveDispute(workerAmount, reason),
          )
            .to.be.revertedWithCustomError(escrow, EscrowError.StringTooLong)
            .withArgs(reasonLength, maxLength);
        });
      }
    });
  });
});
