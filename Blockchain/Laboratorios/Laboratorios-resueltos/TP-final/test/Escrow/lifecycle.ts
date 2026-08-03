import { expect } from "chai";
import { State, type State as EscrowState } from "../constants/State.js";
import { Error } from "../constants/Error.js";
import { Event } from "../constants/Event.js";
import { ethers, networkHelpers } from "../helpers/globals.js";
import { defaultEscrowFixture } from "../helpers/fixtures.js";
import { setNextBlockAt } from "../helpers/time.js";
import {
  DEFAULT_DISPUTE_REASON,
  DEFAULT_RESOLUTION_REASON,
  DEFAULT_SUBMISSION_REFERENCE,
} from "../helpers/transitions.js";
import { getWorkerAndOwnerAmounts } from "../helpers/utils.js";

type LifecycleContext = Awaited<ReturnType<typeof defaultEscrowFixture>>;
type Participant = LifecycleContext["owner"];

async function expectAcceptance(context: LifecycleContext) {
  const { escrow, worker } = context;
  const transaction = await escrow.connect(worker).acceptEscrow();

  await expect(transaction)
    .to.emit(escrow, Event.EscrowAccepted)
    .withArgs(await escrow.submissionDeadline());
  expect(await escrow.state()).to.equal(State.PendingSubmission);
}

async function expectSubmission(context: LifecycleContext) {
  const { escrow, worker } = context;
  const transaction = await escrow.connect(worker).submitWork(DEFAULT_SUBMISSION_REFERENCE);

  await expect(transaction)
    .to.emit(escrow, Event.WorkSubmitted)
    .withArgs(await escrow.reviewDeadline());
  expect(await escrow.state()).to.equal(State.PendingReview);
}

async function expectDispute(context: LifecycleContext) {
  const { escrow, owner } = context;
  const transaction = await escrow.connect(owner).openDispute(DEFAULT_DISPUTE_REASON);

  await expect(transaction)
    .to.emit(escrow, Event.DisputeOpened)
    .withArgs(await escrow.arbitrationDeadline());
  expect(await escrow.state()).to.equal(State.PendingArbitration);
}

/**
 * Espera que todas las transiciones fallen si ya se está en un estado final
 */
async function expectAllLifecycleTransitionsToRevert(
  context: LifecycleContext,
  terminalState: EscrowState,
) {
  const { escrow, owner, worker, arbiter, otherAccounts, amountInWei } = context;
  const keeper = otherAccounts[0];
  const [workerAmount] = getWorkerAndOwnerAmounts(amountInWei, 30n);

  const transitionAttempts = [
    {
      transaction: () => escrow.connect(worker).acceptEscrow(),
      expectedState: State.PendingAcceptance,
    },
    {
      transaction: () => escrow.connect(owner).cancelEscrow(),
      expectedState: State.PendingAcceptance,
    },
    {
      transaction: () => escrow.connect(keeper).expireAcceptance(),
      expectedState: State.PendingAcceptance,
    },
    {
      transaction: () => escrow.connect(worker).submitWork(DEFAULT_SUBMISSION_REFERENCE),
      expectedState: State.PendingSubmission,
    },
    {
      transaction: () => escrow.connect(keeper).expireSubmission(),
      expectedState: State.PendingSubmission,
    },
    {
      transaction: () => escrow.connect(owner).approveWork(),
      expectedState: State.PendingReview,
    },
    {
      transaction: () => escrow.connect(owner).openDispute(DEFAULT_DISPUTE_REASON),
      expectedState: State.PendingReview,
    },
    {
      transaction: () => escrow.connect(keeper).expireReview(),
      expectedState: State.PendingReview,
    },
    {
      transaction: () =>
        escrow.connect(arbiter).resolveDispute(workerAmount, DEFAULT_RESOLUTION_REASON),
      expectedState: State.PendingArbitration,
    },
    {
      transaction: () => escrow.connect(keeper).expireArbitration(),
      expectedState: State.PendingArbitration,
    },
  ];

  for (const { transaction, expectedState } of transitionAttempts) {
    await expect(transaction())
      .to.be.revertedWithCustomError(escrow, Error.InvalidState)
      .withArgs(terminalState, expectedState);
  }
}

async function expectWithdrawal(
  context: LifecycleContext,
  participant: Participant,
  amount: bigint,
) {
  const { escrow, escrowAddress } = context;
  const transaction = escrow.connect(participant).withdraw();

  await expect(transaction)
    .to.emit(escrow, Event.FundsWithdrawn)
    .withArgs(participant.address, amount);
  await expect(transaction).to.changeEtherBalances(
    ethers,
    [escrowAddress, participant.address],
    [-amount, amount],
  );
  expect(await escrow.pendingWithdrawals(participant.address)).to.equal(0n);
}

async function expectEscrowBalanceToBeZero(context: LifecycleContext) {
  expect(await ethers.provider.getBalance(context.escrowAddress)).to.equal(0n);
}

describe("Escrow lifecycle", function () {
  describe("EscrowCancelled", function () {
    it("Should complete the lifecycle through owner cancellation", async function () {
      const context = await networkHelpers.loadFixture(defaultEscrowFixture);
      const { escrow, owner, amountInWei } = context;

      expect(await escrow.state()).to.equal(State.PendingAcceptance);
      await expect(escrow.connect(owner).cancelEscrow()).to.emit(escrow, Event.EscrowCancelled);
      expect(await escrow.state()).to.equal(State.EscrowCancelled);

      await expectAllLifecycleTransitionsToRevert(context, State.EscrowCancelled);
      expect(await escrow.pendingWithdrawals(owner.address)).to.equal(amountInWei);
      await expectWithdrawal(context, owner, amountInWei);
      await expectEscrowBalanceToBeZero(context);
    });
  });

  describe("AcceptanceExpired", function () {
    it("Should complete the lifecycle through acceptance expiration", async function () {
      const context = await networkHelpers.loadFixture(defaultEscrowFixture);
      const { escrow, owner, otherAccounts, amountInWei } = context;

      expect(await escrow.state()).to.equal(State.PendingAcceptance);
      await setNextBlockAt(escrow.acceptanceDeadline());
      await expect(escrow.connect(otherAccounts[0]).expireAcceptance()).to.emit(
        escrow,
        Event.AcceptanceExpired,
      );
      expect(await escrow.state()).to.equal(State.AcceptanceExpired);

      await expectAllLifecycleTransitionsToRevert(context, State.AcceptanceExpired);
      expect(await escrow.pendingWithdrawals(owner.address)).to.equal(amountInWei);
      await expectWithdrawal(context, owner, amountInWei);
      await expectEscrowBalanceToBeZero(context);
    });
  });

  describe("SubmissionExpired", function () {
    it("Should complete the lifecycle through submission expiration", async function () {
      const context = await networkHelpers.loadFixture(defaultEscrowFixture);
      const { escrow, owner, otherAccounts, amountInWei } = context;

      expect(await escrow.state()).to.equal(State.PendingAcceptance);
      await expectAcceptance(context);
      await setNextBlockAt(escrow.submissionDeadline());
      await expect(escrow.connect(otherAccounts[0]).expireSubmission()).to.emit(
        escrow,
        Event.SubmissionExpired,
      );
      expect(await escrow.state()).to.equal(State.SubmissionExpired);

      await expectAllLifecycleTransitionsToRevert(context, State.SubmissionExpired);
      expect(await escrow.pendingWithdrawals(owner.address)).to.equal(amountInWei);
      await expectWithdrawal(context, owner, amountInWei);
      await expectEscrowBalanceToBeZero(context);
    });
  });

  describe("WorkApproved", function () {
    it("Should complete the lifecycle through work approval", async function () {
      const context = await networkHelpers.loadFixture(defaultEscrowFixture);
      const { escrow, owner, worker, amountInWei } = context;

      expect(await escrow.state()).to.equal(State.PendingAcceptance);
      await expectAcceptance(context);
      await expectSubmission(context);
      await expect(escrow.connect(owner).approveWork()).to.emit(escrow, Event.WorkApproved);
      expect(await escrow.state()).to.equal(State.WorkApproved);

      await expectAllLifecycleTransitionsToRevert(context, State.WorkApproved);
      expect(await escrow.pendingWithdrawals(worker.address)).to.equal(amountInWei);
      await expectWithdrawal(context, worker, amountInWei);
      await expectEscrowBalanceToBeZero(context);
    });
  });

  describe("ReviewExpired", function () {
    it("Should complete the lifecycle through review expiration", async function () {
      const context = await networkHelpers.loadFixture(defaultEscrowFixture);
      const { escrow, worker, otherAccounts, amountInWei } = context;

      expect(await escrow.state()).to.equal(State.PendingAcceptance);
      await expectAcceptance(context);
      await expectSubmission(context);
      await setNextBlockAt(escrow.reviewDeadline());
      await expect(escrow.connect(otherAccounts[0]).expireReview()).to.emit(
        escrow,
        Event.ReviewExpired,
      );
      expect(await escrow.state()).to.equal(State.ReviewExpired);

      await expectAllLifecycleTransitionsToRevert(context, State.ReviewExpired);
      expect(await escrow.pendingWithdrawals(worker.address)).to.equal(amountInWei);
      await expectWithdrawal(context, worker, amountInWei);
      await expectEscrowBalanceToBeZero(context);
    });
  });

  describe("DisputeResolved", function () {
    it("Should complete the lifecycle through dispute resolution", async function () {
      const context = await networkHelpers.loadFixture(defaultEscrowFixture);
      const { escrow, owner, worker, arbiter, amountInWei } = context;
      const [workerAmount, ownerAmount] = getWorkerAndOwnerAmounts(amountInWei, 30n);

      expect(await escrow.state()).to.equal(State.PendingAcceptance);
      await expectAcceptance(context);
      await expectSubmission(context);
      await expectDispute(context);
      await expect(escrow.connect(arbiter).resolveDispute(workerAmount, DEFAULT_RESOLUTION_REASON))
        .to.emit(escrow, Event.DisputeResolved)
        .withArgs(ownerAmount, workerAmount);
      expect(await escrow.state()).to.equal(State.DisputeResolved);

      await expectAllLifecycleTransitionsToRevert(context, State.DisputeResolved);
      expect(await escrow.pendingWithdrawals(owner.address)).to.equal(ownerAmount);
      expect(await escrow.pendingWithdrawals(worker.address)).to.equal(workerAmount);
      await expectWithdrawal(context, owner, ownerAmount);
      await expectWithdrawal(context, worker, workerAmount);
      await expectEscrowBalanceToBeZero(context);
    });
  });

  describe("ArbitrationExpired", function () {
    it("Should complete the lifecycle through arbitration expiration", async function () {
      const context = await networkHelpers.loadFixture(defaultEscrowFixture);
      const { escrow, owner, worker, otherAccounts, amountInWei } = context;
      const [workerAmount, ownerAmount] = getWorkerAndOwnerAmounts(amountInWei, 50n);

      expect(await escrow.state()).to.equal(State.PendingAcceptance);
      await expectAcceptance(context);
      await expectSubmission(context);
      await expectDispute(context);
      await setNextBlockAt(escrow.arbitrationDeadline());
      await expect(escrow.connect(otherAccounts[0]).expireArbitration()).to.emit(
        escrow,
        Event.ArbitrationExpired,
      );
      expect(await escrow.state()).to.equal(State.ArbitrationExpired);

      await expectAllLifecycleTransitionsToRevert(context, State.ArbitrationExpired);
      expect(await escrow.pendingWithdrawals(owner.address)).to.equal(ownerAmount);
      expect(await escrow.pendingWithdrawals(worker.address)).to.equal(workerAmount);
      await expectWithdrawal(context, owner, ownerAmount);
      await expectWithdrawal(context, worker, workerAmount);
      await expectEscrowBalanceToBeZero(context);
    });
  });
});
