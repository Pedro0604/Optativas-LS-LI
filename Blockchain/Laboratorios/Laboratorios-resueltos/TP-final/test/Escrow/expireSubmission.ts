import { expect } from "chai";
import { State } from "../constants/State.js";
import { Error } from "../constants/Error.js";
import { Event } from "../constants/Event.js";
import { ethers, networkHelpers } from "../helpers/globals.js";
import { pendingSubmissionFixture } from "../helpers/fixtures.js";
import {
  setNextBlockAfter,
  setNextBlockAt,
  setNextBlockBefore,
} from "../helpers/time.js";

describe("Escrow.expireSubmission", function () {
  describe("successful expiration", function () {
    it(`Should emit the ${Event.SubmissionExpired} event, change its state to SubmissionExpired and credit the full amount to the owner`, async function () {
      const { escrow, owner, amountInWei } = await networkHelpers.loadFixture(
        pendingSubmissionFixture,
      );

      await setNextBlockAt(escrow.submissionDeadline());
      await expect(escrow.connect(owner).expireSubmission())
        .to.emit(escrow, Event.SubmissionExpired)
        .withArgs();

      expect(await escrow.state()).to.equal(State.SubmissionExpired);
      expect(await escrow.arbitrationDeadline()).to.equal(0n);
      expect(await escrow.pendingWithdrawals(owner)).to.equal(amountInWei);
    });

    it(`Should allow being called from accounts other than the owner`, async function () {
      const { escrow, worker } = await networkHelpers.loadFixture(
        pendingSubmissionFixture,
      );

      await setNextBlockAt(escrow.submissionDeadline());
      await expect(escrow.connect(worker).expireSubmission()).to.not.revert(
        ethers,
      );
    });

    it(`Should not revert at submissionDeadline + 1`, async function () {
      const { escrow, owner } = await networkHelpers.loadFixture(
        pendingSubmissionFixture,
      );

      await setNextBlockAfter(escrow.submissionDeadline());
      await expect(escrow.connect(owner).expireSubmission()).to.not.revert(
        ethers,
      );
    });
  });

  describe("failing expiration", function () {
    it(`Should revert when the escrow is not in State.PendingSubmission`, async function () {
      const { escrow, owner } = await networkHelpers.loadFixture(
        pendingSubmissionFixture,
      );

      await setNextBlockAt(escrow.submissionDeadline());
      await escrow.connect(owner).expireSubmission();

      await expect(escrow.connect(owner).expireSubmission())
        .to.be.revertedWithCustomError(escrow, Error.InvalidState)
        .withArgs(State.SubmissionExpired, State.PendingSubmission);
    });

    it(`Should revert at submissionDeadline - 1`, async function () {
      const { escrow, owner } = await networkHelpers.loadFixture(
        pendingSubmissionFixture,
      );

      const submissionDeadline = await setNextBlockBefore(
        escrow.submissionDeadline(),
      );
      await expect(escrow.connect(owner).expireSubmission())
        .to.be.revertedWithCustomError(escrow, Error.DeadlineNotExpiredYet)
        .withArgs(submissionDeadline);
    });
  });
});
