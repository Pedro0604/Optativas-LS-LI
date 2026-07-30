import { expect } from "chai";
import { State } from "../constants/State.js";
import { Error } from "../constants/Error.js";
import { Event } from "../constants/Event.js";
import { ethers, networkHelpers } from "../helpers/globals.js";
import { deployEscrowFactoryWithDefaultEscrowFixture } from "../helpers/fixtures.js";
import { setNextBlockAt, setNextBlockBefore } from "../helpers/time.js";

describe("Escrow.acceptEscrow", function () {
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

      await setNextBlockBefore(escrow.acceptanceDeadline());
      await expect(escrow.connect(worker).acceptEscrow()).to.not.revert(ethers);
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

      const acceptanceDeadline = await setNextBlockAt(escrow.acceptanceDeadline());
      await expect(escrow.connect(worker).acceptEscrow())
        .to.be.revertedWithCustomError(escrow, Error.DeadlineAlreadyExpired)
        .withArgs(acceptanceDeadline);
    });
  });
});
