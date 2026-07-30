import { expect } from "chai";
import { deployEscrowFactoryWithDefaultEscrowFixture } from "../helpers/fixtures.js";
import { networkHelpers } from "../helpers/globals.js";

describe("Escrow expiration views", function () {
  describe("Escrow.acceptanceExpired", function () {
    it(`Should correctly calculate acceptanceExpired around acceptanceDeadline`, async function () {
      const { escrow } = await networkHelpers.loadFixture(
        deployEscrowFactoryWithDefaultEscrowFixture,
      );

      const acceptanceDeadline = await escrow.acceptanceDeadline();

      await networkHelpers.time.increaseTo(acceptanceDeadline - 1n);
      expect(await escrow.acceptanceExpired()).to.be.false;

      await networkHelpers.time.increaseTo(acceptanceDeadline);
      expect(await escrow.acceptanceExpired()).to.be.true;
    });
  });
});
