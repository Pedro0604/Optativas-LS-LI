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

describe("Escrow.approveWork", function () {
  describe("successful approval", function () {
    it(`Should emit the ${Event.WorkApproved} event, change its state to WorkApproved and credit the full amount to the worker`, async function () {
      const { escrow, owner, worker, amountInWei } =
        await networkHelpers.loadFixture(pendingReviewFixture);

      await expect(escrow.connect(owner).approveWork())
        .to.emit(escrow, Event.WorkApproved)
        .withArgs();

      expect(await escrow.state()).to.equal(State.WorkApproved);
      expect(await escrow.pendingWithdrawals(worker)).to.equal(amountInWei);
    });

    it(`Should not revert at reviewDeadline - 1`, async function () {
      const { escrow, owner } =
        await networkHelpers.loadFixture(pendingReviewFixture);

      await setNextBlockBefore(escrow.reviewDeadline());
      await expect(escrow.connect(owner).approveWork()).to.not.revert(ethers);
    });
  });

  describe("failing approval", function () {
    it(`Should revert when sender is not the owner`, async function () {
      const { escrow, worker, arbiter } =
        await networkHelpers.loadFixture(pendingReviewFixture);

      await expect(escrow.connect(worker).approveWork())
        .to.be.revertedWithCustomError(escrow, Error.OnlyOwnerAllowed)
        .withArgs();

      await expect(escrow.connect(arbiter).approveWork())
        .to.be.revertedWithCustomError(escrow, Error.OnlyOwnerAllowed)
        .withArgs();
    });

    it(`Should revert when the escrow is not in State.PendingReview`, async function () {
      const { escrow, owner } =
        await networkHelpers.loadFixture(pendingReviewFixture);

      await escrow.connect(owner).approveWork();

      await expect(escrow.connect(owner).approveWork())
        .to.be.revertedWithCustomError(escrow, Error.InvalidState)
        .withArgs(State.WorkApproved, State.PendingReview);
    });

    it(`Should revert at reviewDeadline`, async function () {
      const { escrow, owner } =
        await networkHelpers.loadFixture(pendingReviewFixture);

      const reviewDeadline = await setNextBlockAt(escrow.reviewDeadline());
      await expect(escrow.connect(owner).approveWork())
        .to.be.revertedWithCustomError(escrow, Error.DeadlineAlreadyExpired)
        .withArgs(reviewDeadline);
    });

    it(`Should revert at reviewDeadline + 1`, async function () {
      const { escrow, owner } =
        await networkHelpers.loadFixture(pendingReviewFixture);

      const reviewDeadline = await setNextBlockAfter(escrow.reviewDeadline());
      await expect(escrow.connect(owner).approveWork())
        .to.be.revertedWithCustomError(escrow, Error.DeadlineAlreadyExpired)
        .withArgs(reviewDeadline);
    });
  });
});
