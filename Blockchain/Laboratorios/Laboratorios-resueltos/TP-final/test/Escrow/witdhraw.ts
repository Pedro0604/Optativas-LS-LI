import { expect } from "chai";
import { State } from "../constants/State.js";
import { Error } from "../constants/Error.js";
import { Event } from "../constants/Event.js";
import { ethers, networkHelpers } from "../helpers/globals.js";
import {
  defaultEscrowFixture,
  nonPayableWithdrawalFixture,
  pendingArbitrationFixture,
  pendingReviewFixture,
  reentrantWithdrawalFixture,
} from "../helpers/fixtures.js";
import { setNextBlockAt } from "../helpers/time.js";
import { getWorkerAndOwnerAmounts } from "../helpers/utils.js";

describe("Escrow.withdraw", function () {
  describe("successful withdrawal", function () {
    it(`Should emit the ${Event.FundsWithdrawn} event, set the pendingWithdrawals to 0 and send the corresponding ETH`, async function () {
      const { escrow, owner, worker, amountInWei, escrowAddress } =
        await networkHelpers.loadFixture(pendingReviewFixture);

      await escrow.connect(owner).approveWork();
      expect(await escrow.pendingWithdrawals(worker.address)).to.equal(
        amountInWei,
      );

      const transaction = escrow.connect(worker).withdraw();
      await expect(transaction)
        .to.emit(escrow, Event.FundsWithdrawn)
        .withArgs(worker.address, amountInWei);
      await expect(transaction).to.changeEtherBalances(
        ethers,
        [escrowAddress, worker.address],
        [-amountInWei, amountInWei],
      );

      expect(await escrow.state()).to.equal(State.WorkApproved); // No debería cambiar
      expect(await escrow.pendingWithdrawals(worker.address)).to.equal(0n);
    });
  });

  describe("failing withdrawal", function () {
    it(`Should revert when sender has no funds to withdraw`, async function () {
      const { escrow, owner } =
        await networkHelpers.loadFixture(defaultEscrowFixture);

      expect(await escrow.pendingWithdrawals(owner.address)).to.equal(0n);
      await expect(
        escrow.connect(owner).withdraw(),
      ).to.be.revertedWithCustomError(escrow, Error.NoFundsToWithdraw);
    });

    it(`Should not allow a double withdrawal`, async function () {
      const { escrow, owner, worker } =
        await networkHelpers.loadFixture(pendingReviewFixture);

      await escrow.connect(owner).approveWork();
      await escrow.connect(worker).withdraw();
      await expect(
        escrow.connect(worker).withdraw(),
      ).to.be.revertedWithCustomError(escrow, Error.NoFundsToWithdraw);
    });

    it(`Should track pendingWtithdrawals independently`, async function () {
      const { escrow, owner, worker, amountInWei, escrowAddress } =
        await networkHelpers.loadFixture(pendingArbitrationFixture);

      await setNextBlockAt(escrow.arbitrationDeadline());
      await escrow.expireArbitration();

      const [workerAmount, ownerAmount] = getWorkerAndOwnerAmounts(
        amountInWei,
        50n,
      );

      expect(await escrow.pendingWithdrawals(owner.address)).to.equal(
        ownerAmount,
      );
      expect(await escrow.pendingWithdrawals(worker.address)).to.equal(
        workerAmount,
      );
      await expect(escrow.connect(owner).withdraw()).to.changeEtherBalances(
        ethers,
        [escrowAddress, owner.address],
        [-ownerAmount, ownerAmount],
      );

      expect(await escrow.pendingWithdrawals(owner.address)).to.equal(0n);
      expect(await escrow.pendingWithdrawals(worker.address)).to.equal(
        workerAmount,
      );
      await expect(escrow.connect(worker).withdraw()).to.changeEtherBalances(
        ethers,
        [escrowAddress, worker.address],
        [-workerAmount, workerAmount],
      );

      expect(await escrow.pendingWithdrawals(owner.address)).to.equal(0n);
      expect(await escrow.pendingWithdrawals(worker.address)).to.equal(0n);
    });

    it("Should prevent withdrawing twice through reentrancy", async function () {
      const {
        escrow,
        reentrantWorker,
        amountInWei,
        escrowAddress,
        reentrantWorkerAddress,
      } = await networkHelpers.loadFixture(reentrantWithdrawalFixture);

      const [workerAmount] = getWorkerAndOwnerAmounts(amountInWei, 50n);

      expect(await escrow.pendingWithdrawals(reentrantWorkerAddress)).to.equal(
        workerAmount,
      );

      const transaction = reentrantWorker.withdraw();

      await expect(transaction)
        .to.emit(escrow, Event.FundsWithdrawn)
        .withArgs(reentrantWorkerAddress, workerAmount);

      await expect(transaction).to.changeEtherBalances(
        ethers,
        [escrowAddress, reentrantWorkerAddress],
        [-workerAmount, workerAmount],
      );

      expect(await reentrantWorker.receiveCalls()).to.equal(1n);
      expect(await reentrantWorker.reentrySucceeded()).to.equal(false);
      expect(await reentrantWorker.reentryRevertData()).to.equal(
        escrow.interface.encodeErrorResult(Error.NoFundsToWithdraw),
      );
      expect(await escrow.pendingWithdrawals(reentrantWorkerAddress)).to.equal(
        0n,
      );
    });

    it("Should revert and restore the pending withdrawal when the receiver cannot receive ETH", async function () {
      const {
        escrow,
        nonPayableWorker,
        amountInWei,
        escrowAddress,
        nonPayableWorkerAddress,
      } = await networkHelpers.loadFixture(nonPayableWithdrawalFixture);

      const escrowBalanceBefore =
        await ethers.provider.getBalance(escrowAddress);

      const [workerAmount] = getWorkerAndOwnerAmounts(amountInWei, 50n);

      expect(await escrow.pendingWithdrawals(nonPayableWorkerAddress)).to.equal(
        workerAmount,
      );

      await expect(nonPayableWorker.withdraw()).to.be.revertedWithCustomError(
        escrow,
        Error.WithdrawalFailed,
      );

      // La asignación a cero se revirtió junto con toda la transacción.
      expect(await escrow.pendingWithdrawals(nonPayableWorkerAddress)).to.equal(
        workerAmount,
      );

      expect(await ethers.provider.getBalance(escrowAddress)).to.equal(
        escrowBalanceBefore,
      );

      expect(
        await ethers.provider.getBalance(nonPayableWorkerAddress),
      ).to.equal(0n);

      expect(await escrow.state()).to.equal(State.ArbitrationExpired);
    });
  });
});
