import { expect } from "chai";
import { State } from "../constants/State.js";
import { Error } from "../constants/Error.js";
import { Event } from "../constants/Event.js";
import { ethers, networkHelpers } from "../helpers/globals.js";
import { defaultEscrowFixture } from "../helpers/fixtures.js";
import { setNextBlockAt, setNextBlockBefore } from "../helpers/time.js";

describe("Escrow.expireAcceptance", function () {
  describe("successful expiration", function () {
    it(`Should emit the ${Event.AcceptanceExpired} event, change its state to AcceptanceExpired and credit the full amount to the owner`, async function () {
      const { escrow, owner, amountInWei } =
        await networkHelpers.loadFixture(defaultEscrowFixture);

      await setNextBlockAt(escrow.acceptanceDeadline());
      await expect(escrow.connect(owner).expireAcceptance())
        .to.emit(escrow, Event.AcceptanceExpired)
        .withArgs();

      expect(await escrow.state()).to.equal(State.AcceptanceExpired);
      expect(await escrow.submissionDeadline()).to.equal(0n);
      expect(await escrow.pendingWithdrawals(owner)).to.equal(amountInWei);
    });

    it(`Should allow being called from accounts other than the owner`, async function () {
      const { escrow, worker } =
        await networkHelpers.loadFixture(defaultEscrowFixture);

      await setNextBlockAt(escrow.acceptanceDeadline());
      await expect(escrow.connect(worker).expireAcceptance()).to.not.revert(
        ethers,
      );
    });
  });

  describe("failing expiration", function () {
    it(`Should revert when the escrow is not in State.PendingAcceptance`, async function () {
      const { escrow, owner } =
        await networkHelpers.loadFixture(defaultEscrowFixture);

      await setNextBlockAt(escrow.acceptanceDeadline());
      await escrow.connect(owner).expireAcceptance();

      await expect(escrow.connect(owner).expireAcceptance())
        .to.be.revertedWithCustomError(escrow, Error.InvalidState)
        .withArgs(State.AcceptanceExpired, State.PendingAcceptance);
    });

    it(`Should revert at acceptanceDeadline - 1`, async function () {
      const { escrow, owner } =
        await networkHelpers.loadFixture(defaultEscrowFixture);

      const acceptanceDeadline = await setNextBlockBefore(
        escrow.acceptanceDeadline(),
      );
      await expect(escrow.connect(owner).expireAcceptance())
        .to.be.revertedWithCustomError(escrow, Error.DeadlineNotExpiredYet)
        .withArgs(acceptanceDeadline);
    });
  });
});
