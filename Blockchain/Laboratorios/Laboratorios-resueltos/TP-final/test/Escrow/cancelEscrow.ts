import { expect } from "chai";
import { State } from "../constants/State.js";
import { Error } from "../constants/Error.js";
import { Event } from "../constants/Event.js";
import { ethers, networkHelpers } from "../helpers/globals.js";
import { defaultEscrowFixture } from "../helpers/fixtures.js";
import { setNextBlockAfter, setNextBlockAt, setNextBlockBefore } from "../helpers/time.js";

describe("Escrow.cancelEscrow", function () {
  describe("successful cancelation", function () {
    it(`Should emit the ${Event.EscrowCancelled} event, change its state to EscrowCancelled and credit the full amount to the owner`, async function () {
      const { escrow, owner, amountInWei } =
        await networkHelpers.loadFixture(defaultEscrowFixture);

      await expect(escrow.connect(owner).cancelEscrow())
        .to.emit(escrow, Event.EscrowCancelled)
        .withArgs();

      expect(await escrow.state()).to.equal(State.EscrowCancelled);
      expect(await escrow.submissionDeadline()).to.equal(0n);
      expect(await escrow.pendingWithdrawals(owner)).to.equal(amountInWei);
    });

    it(`Should not revert at acceptanceDeadline - 1`, async function () {
      const { escrow, owner } =
        await networkHelpers.loadFixture(defaultEscrowFixture);

      await setNextBlockBefore(escrow.acceptanceDeadline());
      await expect(escrow.connect(owner).cancelEscrow()).to.not.revert(ethers);
    });
  });

  describe("failing cancelation", function () {
    it(`Should revert when sender is not the owner`, async function () {
      const { escrow, worker, arbiter } =
        await networkHelpers.loadFixture(defaultEscrowFixture);

      await expect(escrow.connect(worker).cancelEscrow())
        .to.be.revertedWithCustomError(escrow, Error.OnlyOwnerAllowed)
        .withArgs();

      await expect(escrow.connect(arbiter).cancelEscrow())
        .to.be.revertedWithCustomError(escrow, Error.OnlyOwnerAllowed)
        .withArgs();
    });

    it(`Should revert when the escrow is not in State.PendingAcceptance`, async function () {
      const { escrow, owner } =
        await networkHelpers.loadFixture(defaultEscrowFixture);

      await escrow.connect(owner).cancelEscrow();

      await expect(escrow.connect(owner).cancelEscrow())
        .to.be.revertedWithCustomError(escrow, Error.InvalidState)
        .withArgs(State.EscrowCancelled, State.PendingAcceptance);
    });

    it(`Should revert at acceptanceDeadline`, async function () {
      const { escrow, owner } =
        await networkHelpers.loadFixture(defaultEscrowFixture);

      const acceptanceDeadline = await setNextBlockAt(
        escrow.acceptanceDeadline(),
      );
      await expect(escrow.connect(owner).cancelEscrow())
        .to.be.revertedWithCustomError(escrow, Error.DeadlineAlreadyExpired)
        .withArgs(acceptanceDeadline);
    });

    it(`Should revert at acceptanceDeadline + 1`, async function () {
      const { escrow, owner } =
        await networkHelpers.loadFixture(defaultEscrowFixture);

      const acceptanceDeadline = await setNextBlockAfter(
        escrow.acceptanceDeadline(),
      );
      await expect(escrow.connect(owner).cancelEscrow())
        .to.be.revertedWithCustomError(escrow, Error.DeadlineAlreadyExpired)
        .withArgs(acceptanceDeadline);
    });
  });
});
