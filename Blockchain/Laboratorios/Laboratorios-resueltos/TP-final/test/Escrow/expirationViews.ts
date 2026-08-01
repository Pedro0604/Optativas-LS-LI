import { expect } from "chai";
import {
  defaultEscrowFixture,
  pendingArbitrationFixture,
  pendingReviewFixture,
  pendingSubmissionFixture,
} from "../helpers/fixtures.js";
import { networkHelpers } from "../helpers/globals.js";

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
  {
    expiredFunctionName: "arbitrationExpired",
    deadlineName: "arbitrationDeadline",
    fixture: pendingArbitrationFixture,
  },
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
