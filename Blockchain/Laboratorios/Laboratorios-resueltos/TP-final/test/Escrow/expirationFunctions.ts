import { expect } from "chai";
import { State } from "../constants/State.js";
import { Error } from "../constants/Error.js";
import { Event } from "../constants/Event.js";
import { ethers, networkHelpers, SECONDS_PER_DAY } from "../helpers/globals.js";
import {
  defaultEscrowFixture,
  pendingArbitrationFixture,
  pendingReviewFixture,
  pendingSubmissionFixture,
} from "../helpers/fixtures.js";
import {
  setNextBlockAfter,
  setNextBlockAt,
  setNextBlockBefore,
} from "../helpers/time.js";
import { createEscrow } from "../helpers/createEscrow.js";

const expirationCases = [
  {
    fixture: defaultEscrowFixture,
    expireFunction: "expireAcceptance",
    deadlineFunction: "acceptanceDeadline",
    notSetDeadline: "submissionDeadline",
    expirationEvent: "AcceptanceExpired",
    pendingState: "PendingAcceptance",
    expiredState: "AcceptanceExpired",
    beneficiary: "owner",
  },
  {
    fixture: pendingSubmissionFixture,
    expireFunction: "expireSubmission",
    deadlineFunction: "submissionDeadline",
    notSetDeadline: "reviewDeadline",
    expirationEvent: "SubmissionExpired",
    pendingState: "PendingSubmission",
    expiredState: "SubmissionExpired",
    beneficiary: "owner",
  },
  {
    fixture: pendingReviewFixture,
    expireFunction: "expireReview",
    deadlineFunction: "reviewDeadline",
    notSetDeadline: "arbitrationDeadline",
    expirationEvent: "ReviewExpired",
    pendingState: "PendingReview",
    expiredState: "ReviewExpired",
    beneficiary: "worker",
  },
  {
    fixture: pendingArbitrationFixture,
    expireFunction: "expireArbitration",
    deadlineFunction: "arbitrationDeadline",
    notSetDeadline: null,
    expirationEvent: "ArbitrationExpired",
    pendingState: "PendingArbitration",
    expiredState: "ArbitrationExpired",
    beneficiary: "both",
  },
] as const;

describe("Escrow expiration functions", function () {
  for (const {
    fixture,
    expireFunction,
    deadlineFunction,
    notSetDeadline,
    expirationEvent,
    pendingState,
    expiredState,
    beneficiary,
  } of expirationCases) {
    describe(`Escrow.${expireFunction}`, function () {
      describe("successful expiration", function () {
        it(`Should emit the ${Event[expirationEvent]} expirationEvent, change its state to State.${expiredState} and credit the amount to ${beneficiary}`, async function () {
          const { escrow, owner, worker, amountInWei } =
            await networkHelpers.loadFixture(fixture);

          await setNextBlockAt(escrow[deadlineFunction]());

          await expect(escrow[expireFunction]()).to.emit(
            escrow,
            Event[expirationEvent],
          );

          expect(await escrow.state()).to.equal(State[expiredState]);
          if (notSetDeadline !== null) {
            expect(await escrow[notSetDeadline]()).to.equal(0n);
          }
          switch (beneficiary) {
            case "owner":
              expect(await escrow.pendingWithdrawals(owner)).to.equal(
                amountInWei,
              );
              break;
            case "worker":
              expect(await escrow.pendingWithdrawals(worker)).to.equal(
                amountInWei,
              );
              break;
            case "both":
              const ownerAmount = amountInWei / 2n; // Es división entera, por lo que descarta el resto si amountInWei es impar
              const workerAmount = amountInWei - ownerAmount; // Si amountInWei queda con 1 wei más que el owner

              expect(await escrow.pendingWithdrawals(owner)).to.equal(
                ownerAmount,
              );
              expect(await escrow.pendingWithdrawals(worker)).to.equal(
                workerAmount,
              );
              break;
          }
        });

        it(`Should allow ${expireFunction} to be called from any account`, async function () {
          const { otherAccounts } = await networkHelpers.loadFixture(fixture);
          for (const account of otherAccounts) {
            const { escrow } = await networkHelpers.loadFixture(fixture);
            await setNextBlockAt(escrow[deadlineFunction]());
            await expect(
              escrow.connect(account)[expireFunction](),
            ).to.not.revert(ethers);
          }
        });

        it(`Should not revert when ${expireFunction} is called at ${deadlineFunction} + 1`, async function () {
          const { escrow } = await networkHelpers.loadFixture(fixture);

          await setNextBlockAfter(escrow[deadlineFunction]());

          await expect(escrow[expireFunction]()).to.not.revert(ethers);
        });
      });

      describe("failing expiration", function () {
        it(`Should revert when the escrow is not in State.${pendingState}`, async function () {
          const { escrow } = await networkHelpers.loadFixture(fixture);

          await setNextBlockAt(escrow[deadlineFunction]());
          await escrow[expireFunction](); // Mueve el estado

          await expect(escrow[expireFunction]())
            .to.be.revertedWithCustomError(escrow, Error.InvalidState)
            .withArgs(State[expiredState], State[pendingState]);
        });

        it(`Should revert when ${expireFunction} is called at ${deadlineFunction} - 1`, async function () {
          const { escrow } = await networkHelpers.loadFixture(fixture);

          const deadline = await setNextBlockBefore(escrow[deadlineFunction]());

          await expect(escrow[expireFunction]())
            .to.be.revertedWithCustomError(escrow, Error.DeadlineNotExpiredYet)
            .withArgs(deadline);
        });
      });
    });

    describe(`Escrow.expireArbitration odd amount`, function () {
      // Se crea este test porque el default siempre es par, entonces no se probaría nunca el caso impar
      it(`Should credit 1 wei more to the worker when the amount is odd`, async function () {
        const { escrowFactory, owner, worker, arbiter } =
          await networkHelpers.loadFixture(defaultEscrowFixture);

        const amountInWei = ethers.parseEther("1") + 1n; // Impar
        await escrowFactory
          .connect(owner)
          .createEscrow(
            worker.address,
            arbiter.address,
            SECONDS_PER_DAY * 10n,
            SECONDS_PER_DAY * 10n,
            SECONDS_PER_DAY * 10n,
            SECONDS_PER_DAY * 10n,
            "Título",
            {
              value: amountInWei,
            },
          );

        const escrowAddress = await escrowFactory.allEscrows(1); // El 0 es el default, el 1 es el de wei impar
        const escrow = await ethers.getContractAt("Escrow", escrowAddress);

        await escrow.connect(worker).acceptEscrow();
        await escrow.connect(worker).submitWork("Submit");
        await escrow.connect(owner).openDispute("Dispute");

        await setNextBlockAt(escrow.arbitrationDeadline());
        await escrow.expireArbitration();

        const ownerAmount = amountInWei / 2n; // Es división entera, por lo que descarta el resto si amountInWei es impar
        const workerAmount = amountInWei - ownerAmount; // Si amountInWei queda con 1 wei más que el owner

        expect(await escrow.pendingWithdrawals(owner)).to.equal(ownerAmount);
        expect(await escrow.pendingWithdrawals(worker)).to.equal(workerAmount);
      });
    });
  }
});
