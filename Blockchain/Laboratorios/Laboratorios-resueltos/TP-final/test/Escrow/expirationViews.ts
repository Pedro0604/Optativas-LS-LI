import { expect } from "chai";
import {
  defaultEscrowFixture,
  pendingArbitrationFixture,
  pendingReviewFixture,
  pendingSubmissionFixture,
} from "../helpers/fixtures.js";
import { networkHelpers } from "../helpers/globals.js";

describe("Escrow expiration views", function () {
  describe("Escrow.acceptanceExpired", function () {
    it(`Should correctly calculate acceptanceExpired around acceptanceDeadline`, async function () {
      const { escrow } = await networkHelpers.loadFixture(defaultEscrowFixture);

      const acceptanceDeadline = await escrow.acceptanceDeadline();

      await networkHelpers.time.increaseTo(acceptanceDeadline - 1n);
      expect(await escrow.acceptanceExpired()).to.be.false;

      await networkHelpers.time.increaseTo(acceptanceDeadline);
      expect(await escrow.acceptanceExpired()).to.be.true;

      await networkHelpers.time.increaseTo(acceptanceDeadline + 1n);
      expect(await escrow.acceptanceExpired()).to.be.true;
    });
  });

  describe("Escrow.submissionExpired", function () {
    it(`Should correctly calculate submissionExpired around submissionDeadline`, async function () {
      const { escrow } = await networkHelpers.loadFixture(
        pendingSubmissionFixture,
      );

      const submissionDeadline = await escrow.submissionDeadline();

      await networkHelpers.time.increaseTo(submissionDeadline - 1n);
      expect(await escrow.submissionExpired()).to.be.false;

      await networkHelpers.time.increaseTo(submissionDeadline);
      expect(await escrow.submissionExpired()).to.be.true;

      await networkHelpers.time.increaseTo(submissionDeadline + 1n);
      expect(await escrow.submissionExpired()).to.be.true;
    });
  });
});

const expirationCases = [
  {
    expiredFunctionName: "acceptanceExpired",
    deadlineName: "acceptanceDeadline",
    fixture: defaultEscrowFixture,
  },
  {
    expiredFunctionName: "submissionExpired",
    deadlineName: "submissionDeadline",
    fixture: pendingSubmissionFixture,
  },
  {
    expiredFunctionName: "reviewExpired",
    deadlineName: "reviewDeadline",
    fixture: pendingReviewFixture,
  },
  // TODO - DESCOMENTAR CUANDO ESTÉ LA FUNCIONALIDAD PARA LLEGAR A PENDING_ARBITRATION
  // {
  //   expiredFunctionName: "arbitrationExpired",
  //   deadlineName: "arbitrationDeadline",
  //   fixture: pendingArbitrationFixture,
  // },
] as const;

describe("Escrow expiration views", function () {
  for (const {
    expiredFunctionName,
    deadlineName,
    fixture,
  } of expirationCases) {
    describe(`Escrow.${expiredFunctionName}`, function () {
      it(`Should correctly calculate ${expiredFunctionName} around ${deadlineName}`, async function () {
        const { escrow } = await networkHelpers.loadFixture(fixture);

        const deadline = await escrow[deadlineName]();

        await networkHelpers.time.increaseTo(deadline - 1n);
        expect(await escrow[expiredFunctionName]()).to.be.false;

        await networkHelpers.time.increaseTo(deadline);
        expect(await escrow[expiredFunctionName]()).to.be.true;

        await networkHelpers.time.increaseTo(deadline + 1n);
        expect(await escrow[expiredFunctionName]()).to.be.true;
      });
    });
  }
});
