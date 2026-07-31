import { expect } from "chai";
import { State } from "../constants/State.js";
import { Error } from "../constants/Error.js";
import { Event } from "../constants/Event.js";
import { ethers, networkHelpers } from "../helpers/globals.js";
import { pendingSubmissionFixture } from "../helpers/fixtures.js";
import { setNextBlockAt, setNextBlockBefore } from "../helpers/time.js";
import { DEFAULT_SUBMISSION_REFERENCE } from "../helpers/transitions.js";
import { tooLongStringCases, validStringCases } from "../cases/title.js";
import { getUtf8ByteLength } from "../helpers/utils.js";

describe("Escrow.submitWork", function () {
  describe("successful submission", function () {
    it(`Should emit the ${Event.WorkSubmitted} event, change its state to PendingReview, set reviewDeadline and set submissionReference`, async function () {
      const { escrow, worker, reviewDuration } =
        await networkHelpers.loadFixture(pendingSubmissionFixture);

      const latestTimestamp = await networkHelpers.time.latest();
      const nextBlockTimestamp = latestTimestamp + 12;
      await networkHelpers.time.setNextBlockTimestamp(nextBlockTimestamp);

      const expectedReviewDeadline =
        BigInt(nextBlockTimestamp) + reviewDuration;

      await expect(
        escrow.connect(worker).submitWork(DEFAULT_SUBMISSION_REFERENCE),
      )
        .to.emit(escrow, Event.WorkSubmitted)
        .withArgs(expectedReviewDeadline);

      expect(await escrow.state()).to.equal(State.PendingReview);
      expect(await escrow.reviewDeadline()).to.equal(expectedReviewDeadline);
      expect(await escrow.submissionReference()).to.equal(
        DEFAULT_SUBMISSION_REFERENCE,
      );
    });

    it(`Should not revert at submissionDeadline - 1`, async function () {
      const { escrow, worker } = await networkHelpers.loadFixture(
        pendingSubmissionFixture,
      );

      await setNextBlockBefore(escrow.submissionDeadline());
      await expect(
        escrow.connect(worker).submitWork(DEFAULT_SUBMISSION_REFERENCE),
      ).to.not.revert(ethers);
    });

    describe("valid submissionReference length", function () {
      for (const testCase of validStringCases) {
        it(`Should accept ${testCase.description}`, async function () {
          const { escrow, worker } = await networkHelpers.loadFixture(
            pendingSubmissionFixture,
          );

          const maxLength = await escrow.MAX_SUBMISSION_REFERENCE_LENGTH();
          const reference = testCase.buildValue(maxLength);
          const expectedLength = testCase.expectedLength(maxLength);

          expect(getUtf8ByteLength(reference)).to.equal(expectedLength);
          await expect(
            escrow.connect(worker).submitWork(reference),
          ).to.not.revert(ethers);
          expect(await escrow.submissionReference()).to.equal(reference);
        });
      }
    });
  });

  describe("failing submission", function () {
    it(`Should revert when sender is not the worker`, async function () {
      const { escrow, owner, arbiter } = await networkHelpers.loadFixture(
        pendingSubmissionFixture,
      );

      await expect(
        escrow.connect(owner).submitWork(DEFAULT_SUBMISSION_REFERENCE),
      )
        .to.be.revertedWithCustomError(escrow, Error.OnlyWorkerAllowed)
        .withArgs();

      await expect(
        escrow.connect(arbiter).submitWork(DEFAULT_SUBMISSION_REFERENCE),
      )
        .to.be.revertedWithCustomError(escrow, Error.OnlyWorkerAllowed)
        .withArgs();
    });

    it(`Should revert when the escrow is not in State.PendingSubmission`, async function () {
      const { escrow, worker } = await networkHelpers.loadFixture(
        pendingSubmissionFixture,
      );

      await escrow.connect(worker).submitWork(DEFAULT_SUBMISSION_REFERENCE);

      await expect(
        escrow.connect(worker).submitWork(DEFAULT_SUBMISSION_REFERENCE),
      )
        .to.be.revertedWithCustomError(escrow, Error.InvalidState)
        .withArgs(State.PendingReview, State.PendingSubmission);
    });

    it(`Should revert at submissionDeadline`, async function () {
      const { escrow, worker } = await networkHelpers.loadFixture(
        pendingSubmissionFixture,
      );

      const submissionDeadline = await setNextBlockAt(
        escrow.submissionDeadline(),
      );
      await expect(
        escrow.connect(worker).submitWork(DEFAULT_SUBMISSION_REFERENCE),
      )
        .to.be.revertedWithCustomError(escrow, Error.DeadlineAlreadyExpired)
        .withArgs(submissionDeadline);
    });

    it("Should revert when submissionReference is empty", async function () {
      const { escrow, worker } = await networkHelpers.loadFixture(
        pendingSubmissionFixture,
      );

      await expect(
        escrow.connect(worker).submitWork(""),
      ).to.be.revertedWithCustomError(escrow, Error.EmptyString);
    });

    describe("submissionReference exceeding MAX_SUBMISSION_REFERENCE_LENGTH", function () {
      for (const testCase of tooLongStringCases) {
        it(`Should revert when submissionReference length exceeds MAX_SUBMISSION_REFERENCE_LENGTH using ${testCase.description}`, async function () {
          const { escrow, worker } = await networkHelpers.loadFixture(
            pendingSubmissionFixture,
          );

          const maxLength = await escrow.MAX_SUBMISSION_REFERENCE_LENGTH();
          const reference = testCase.buildValue(maxLength);
          const expectedLength = testCase.expectedLength(maxLength);
          const referenceLength = getUtf8ByteLength(reference);
          expect(referenceLength).to.equal(expectedLength);

          await expect(escrow.connect(worker).submitWork(reference))
            .to.be.revertedWithCustomError(escrow, Error.StringTooLong)
            .withArgs(referenceLength, maxLength);
        });
      }
    });
  });
});
