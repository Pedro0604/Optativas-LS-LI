import { expect } from "chai";
import { State } from "../constants/State.js";
import { Error } from "../constants/Error.js";
import { Event } from "../constants/Event.js";
import { ethers, networkHelpers } from "../helpers/globals.js";
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
  // TODO - DESCOMENTAR CUANDO ESTÉ LA FUNCIONALIDAD PARA EXPIRAR ARBITRATION
  //   {
  //     fixture: pendingArbitrationFixture,
  //     expireFunction: "expireArbitration",
  //     deadlineFunction: "arbitrationDeadline",
  //     notSetDeadline: null,
  //     expirationEvent: "ArbitrationExpired",
  //     pendingState: "PendingArbitration",
  //     expiredState: "ArbitrationExpired",
  //     beneficiary: "both",
  //   },
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
        it(`Should emit the ${Event[expirationEvent]} expirationEvent, change its state to State.${expiredState} and credit the full amount to the ${beneficiary}`, async function () {
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
            // TODO - DESCOMENTAR CUANDO ESTÉ LA FUNCIONALIDAD PARA EXPIRAR ARBITRATION
            // case "both":
            //   const halfWei = amountInWei / 2n;
            //   const isEven = amountInWei % 2n === 0n;

            //   expect(await escrow.pendingWithdrawals(owner)).to.equal(halfWei);
            //   expect(await escrow.pendingWithdrawals(worker)).to.equal(
            //     isEven ? halfWei : halfWei + 1n,
            //   );
            // break;
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
  }
});
