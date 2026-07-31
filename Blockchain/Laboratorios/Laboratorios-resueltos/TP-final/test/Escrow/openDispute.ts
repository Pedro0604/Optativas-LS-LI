import { expect } from "chai";
import { State } from "../constants/State.js";
import { Error } from "../constants/Error.js";
import { Event } from "../constants/Event.js";
import { ethers, networkHelpers } from "../helpers/globals.js";
import { pendingReviewFixture } from "../helpers/fixtures.js";
import {
  setNextBlockAfter,
  setNextBlockAt,
  setNextBlockBefore,
} from "../helpers/time.js";
import { DEFAULT_DISPUTE_REASON } from "../helpers/transitions.js";
import { tooLongStringCases, validStringCases } from "../cases/title.js";
import { getUtf8ByteLength } from "../helpers/utils.js";

describe("Escrow.openDispute", function () {
  describe("successful dispute", function () {
    it(`Should emit the ${Event.DisputeOpened} event, change its state to PendingArbitration, set arbitrationDeadline and set disputeReason`, async function () {
      const { escrow, owner, reviewDuration } =
        await networkHelpers.loadFixture(pendingReviewFixture);

      const latestTimestamp = await networkHelpers.time.latest();
      const nextBlockTimestamp = latestTimestamp + 12;
      await networkHelpers.time.setNextBlockTimestamp(nextBlockTimestamp);

      const expectedarbitrationDeadline =
        BigInt(nextBlockTimestamp) + reviewDuration;

      await expect(escrow.connect(owner).openDispute(DEFAULT_DISPUTE_REASON))
        .to.emit(escrow, Event.DisputeOpened)
        .withArgs(expectedarbitrationDeadline);

      expect(await escrow.state()).to.equal(State.PendingArbitration);
      expect(await escrow.arbitrationDeadline()).to.equal(
        expectedarbitrationDeadline,
      );
      expect(await escrow.disputeReason()).to.equal(DEFAULT_DISPUTE_REASON);
    });

    it(`Should not revert at reviewDeadline - 1`, async function () {
      const { escrow, owner } =
        await networkHelpers.loadFixture(pendingReviewFixture);

      await setNextBlockBefore(escrow.reviewDeadline());
      await expect(
        escrow.connect(owner).openDispute(DEFAULT_DISPUTE_REASON),
      ).to.not.revert(ethers);
    });

    describe("valid disputeReason length", function () {
      for (const testCase of validStringCases) {
        it(`Should accept ${testCase.description}`, async function () {
          const { escrow, owner } =
            await networkHelpers.loadFixture(pendingReviewFixture);

          const maxLength = await escrow.MAX_DISPUTE_REASON_LENGTH();
          const reason = testCase.buildValue(maxLength);
          const expectedLength = testCase.expectedLength(maxLength);

          expect(getUtf8ByteLength(reason)).to.equal(expectedLength);
          await expect(escrow.connect(owner).openDispute(reason)).to.not.revert(
            ethers,
          );
          expect(await escrow.disputeReason()).to.equal(reason);
        });
      }
    });
  });

  describe("failing dispute", function () {
    it(`Should revert when sender is not the owner`, async function () {
      const { escrow, worker, arbiter } =
        await networkHelpers.loadFixture(pendingReviewFixture);

      await expect(escrow.connect(worker).openDispute(DEFAULT_DISPUTE_REASON))
        .to.be.revertedWithCustomError(escrow, Error.OnlyOwnerAllowed)
        .withArgs();

      await expect(escrow.connect(arbiter).openDispute(DEFAULT_DISPUTE_REASON))
        .to.be.revertedWithCustomError(escrow, Error.OnlyOwnerAllowed)
        .withArgs();
    });

    it(`Should revert when the escrow is not in State.PendingReview`, async function () {
      const { escrow, owner } =
        await networkHelpers.loadFixture(pendingReviewFixture);

      await escrow.connect(owner).openDispute(DEFAULT_DISPUTE_REASON);

      await expect(escrow.connect(owner).openDispute(DEFAULT_DISPUTE_REASON))
        .to.be.revertedWithCustomError(escrow, Error.InvalidState)
        .withArgs(State.PendingArbitration, State.PendingReview);
    });

    it(`Should revert at reviewDeadline`, async function () {
      const { escrow, owner } =
        await networkHelpers.loadFixture(pendingReviewFixture);

      const reviewDeadline = await setNextBlockAt(escrow.reviewDeadline());
      await expect(escrow.connect(owner).openDispute(DEFAULT_DISPUTE_REASON))
        .to.be.revertedWithCustomError(escrow, Error.DeadlineAlreadyExpired)
        .withArgs(reviewDeadline);
    });

    it(`Should revert at reviewDeadline + 1`, async function () {
      const { escrow, owner } =
        await networkHelpers.loadFixture(pendingReviewFixture);

      const reviewDeadline = await setNextBlockAfter(escrow.reviewDeadline());
      await expect(escrow.connect(owner).openDispute(DEFAULT_DISPUTE_REASON))
        .to.be.revertedWithCustomError(escrow, Error.DeadlineAlreadyExpired)
        .withArgs(reviewDeadline);
    });

    it("Should revert when disputeReason is empty", async function () {
      const { escrow, owner } =
        await networkHelpers.loadFixture(pendingReviewFixture);

      await expect(
        escrow.connect(owner).openDispute(""),
      ).to.be.revertedWithCustomError(escrow, Error.EmptyString);
    });

    describe("disputeReason exceeding MAX_DISPUTE_REASON_LENGTH", function () {
      for (const testCase of tooLongStringCases) {
        it(`Should revert when disputeReason length exceeds MAX_DISPUTE_REASON_LENGTH using ${testCase.description}`, async function () {
          const { escrow, owner } =
            await networkHelpers.loadFixture(pendingReviewFixture);

          const maxLength = await escrow.MAX_DISPUTE_REASON_LENGTH();
          const reason = testCase.buildValue(maxLength);
          const expectedLength = testCase.expectedLength(maxLength);
          const reasonLength = getUtf8ByteLength(reason);
          expect(reasonLength).to.equal(expectedLength);

          await expect(escrow.connect(owner).openDispute(reason))
            .to.be.revertedWithCustomError(escrow, Error.StringTooLong)
            .withArgs(reasonLength, maxLength);
        });
      }
    });
  });
});
