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

describe("Escrow.expireReview", function () {
  describe("successful expiration", function () {
    it(`Should emit the ${Event.ReviewExpired} event, change its state to ReviewExpired and credit the full amount to the worker`, async function () {
      const { escrow, owner, worker, amountInWei } = await networkHelpers.loadFixture(
        pendingReviewFixture,
      );

      await setNextBlockAt(escrow.reviewDeadline());
      await expect(escrow.connect(owner).expireReview())
        .to.emit(escrow, Event.ReviewExpired)
        .withArgs();

      expect(await escrow.state()).to.equal(State.ReviewExpired);
      expect(await escrow.arbitrationDeadline()).to.equal(0n);
      expect(await escrow.pendingWithdrawals(worker)).to.equal(amountInWei);
    });

    it(`Should allow being called from accounts other than the owner`, async function () {
      const { escrow, worker } = await networkHelpers.loadFixture(
        pendingReviewFixture,
      );

      await setNextBlockAt(escrow.reviewDeadline());
      await expect(escrow.connect(worker).expireReview()).to.not.revert(
        ethers,
      );
    });

    it(`Should not revert at reviewDeadline + 1`, async function () {
      const { escrow, owner } = await networkHelpers.loadFixture(
        pendingReviewFixture,
      );

      await setNextBlockAfter(escrow.reviewDeadline());
      await expect(escrow.connect(owner).expireReview()).to.not.revert(
        ethers,
      );
    });
  });

  describe("failing expiration", function () {
    it(`Should revert when the escrow is not in State.PendingReview`, async function () {
      const { escrow, owner } = await networkHelpers.loadFixture(
        pendingReviewFixture,
      );

      await setNextBlockAt(escrow.reviewDeadline());
      await escrow.connect(owner).expireReview();

      await expect(escrow.connect(owner).expireReview())
        .to.be.revertedWithCustomError(escrow, Error.InvalidState)
        .withArgs(State.ReviewExpired, State.PendingReview);
    });

    it(`Should revert at reviewDeadline - 1`, async function () {
      const { escrow, owner } = await networkHelpers.loadFixture(
        pendingReviewFixture,
      );

      const reviewDeadline = await setNextBlockBefore(
        escrow.reviewDeadline(),
      );
      await expect(escrow.connect(owner).expireReview())
        .to.be.revertedWithCustomError(escrow, Error.DeadlineNotExpiredYet)
        .withArgs(reviewDeadline);
    });
  });
});
