import { expect } from "chai";
import {
  networkHelpers,
  ethers,
  deployEscrowFactoryWithDefaultEscrowFixture,
  EscrowState,
  sendCreateEscrow,
  getUtf8ByteLength,
  SECONDS_PER_DAY,
  createEscrow,
  deployEscrowFactoryFixture,
} from "./utils.js";

describe("Escrow", function () {
  describe("constructor through EscrowFactory.createEscrow", function () {
    describe("successful creation", function () {
      it("Should correctly save the values and ETH balance of an Escrow", async function () {
        const {
          owner,
          worker,
          escrowAddress,
          escrow,
          amountInWei,
          title,
          receipt,
          durationDays,
        } = await networkHelpers.loadFixture(
          deployEscrowFactoryWithDefaultEscrowFixture,
        );

        expect(await escrow.owner()).to.equal(owner.address);
        expect(await escrow.worker()).to.equal(worker.address);
        expect(await escrow.amount()).to.equal(amountInWei);
        expect(await escrow.title()).to.equal(title);
        expect(await escrow.state()).to.equal(EscrowState.Funded);
        expect(await ethers.provider.getBalance(escrowAddress)).to.equal(
          amountInWei,
        );

        const escrowDeploymentBlock = await receipt.getBlock();
        const expectedDeadline =
          BigInt(escrowDeploymentBlock.timestamp) +
          BigInt(durationDays) * SECONDS_PER_DAY;
        expect(await escrow.deadline()).to.equal(expectedDeadline);
      });

      it("Should not revert when title length using ASCII is equal to 1 or to MAX_TITLE_LENGTH", async function () {
        const { escrowFactory, owner, worker } =
          await networkHelpers.loadFixture(deployEscrowFactoryFixture);

        // Como no debe fallar, se puede usar createEscrow directamente, y luego expect(transaction)
        const { escrow: escrowOneChar, transaction: transactionEscrowOneChar } =
          await createEscrow({
            escrowFactory,
            owner,
            workerAddress: worker.address,
            title: "a",
          });

        await expect(transactionEscrowOneChar).to.not.revert(ethers);
        expect(await escrowOneChar.title()).to.equal("a");

        const maxLength = await escrowOneChar.MAX_TITLE_LENGTH();
        const maxLengthTitle = "a".repeat(Number(maxLength));

        const {
          escrow: escrowMaxLength,
          transaction: transactionEscrowMaxLength,
        } = await createEscrow({
          escrowFactory,
          owner,
          workerAddress: worker.address,
          title: maxLengthTitle,
        });

        expect(getUtf8ByteLength(maxLengthTitle)).to.equal(maxLength);
        await expect(transactionEscrowMaxLength).to.not.revert(ethers);
        expect(await escrowMaxLength.title()).to.equal(maxLengthTitle);
      });

      describe("UTF-8 title length", function () {
        it("Should accept MAX_TITLE_LENGTH bytes using an accented character", async function () {
          const { escrowFactory, owner, worker, escrow } =
            await networkHelpers.loadFixture(
              deployEscrowFactoryWithDefaultEscrowFixture,
            );

          const maxLength = await escrow.MAX_TITLE_LENGTH();
          const okTitleWithAccent = "a".repeat(Number(maxLength - 2n)) + "á"; // 'á' ocupa 2 bytes

          const { escrow: accentedEscrow, transaction } = await createEscrow({
            escrowFactory,
            owner,
            workerAddress: worker.address,
            title: okTitleWithAccent,
          });

          expect(getUtf8ByteLength(okTitleWithAccent)).to.equal(maxLength);
          await expect(transaction).to.not.revert(ethers);
          expect(await accentedEscrow.title()).to.equal(okTitleWithAccent);
        });

        it("Should accept MAX_TITLE_LENGTH bytes using an emoji", async function () {
          const { escrowFactory, owner, worker, escrow } =
            await networkHelpers.loadFixture(
              deployEscrowFactoryWithDefaultEscrowFixture,
            );

          const maxLength = await escrow.MAX_TITLE_LENGTH();
          const okTitleWithEmoji = "a".repeat(Number(maxLength - 4n)) + "😎"; // '😎' ocupa 4 bytes

          const { escrow: emojiEscrow, transaction } = await createEscrow({
            escrowFactory,
            owner,
            workerAddress: worker.address,
            title: okTitleWithEmoji,
          });

          expect(getUtf8ByteLength(okTitleWithEmoji)).to.equal(maxLength);
          await expect(transaction).to.not.revert(ethers);
          expect(await emojiEscrow.title()).to.equal(okTitleWithEmoji);
        });
      });
    });

    describe("failures", function () {
      // En los casos de fallo se usa el fixture deployEscrowFactoryWithDefaultEscrowFixture
      // así se tiene acceso a `escrow` para poder acceder a los errores y constantes definidos
      // en el contrato

      // Además, se usa obligatoriamente sendCreateEscrow porque no lanza excepción si hay revert
      // al esperarse que se mine el bloque solo dentro del expect().to.revert()
      it("Should revert when no eth is provided", async function () {
        const { escrowFactory, owner, worker, escrow } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner,
            workerAddress: worker.address,
            amountInEth: 0,
          }),
        ).to.be.revertedWithCustomError(escrow, "NoEthProvided");
      });

      it("Should revert when the worker address is address(0)", async function () {
        const { escrowFactory, owner, escrow } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner,
            workerAddress: ethers.ZeroAddress,
          }),
        ).to.be.revertedWithCustomError(escrow, "ZeroAddress");
      });

      it("Should revert when owner is the same account as worker", async function () {
        const { escrowFactory, owner, escrow } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner,
            workerAddress: owner.address,
          }),
        ).to.be.revertedWithCustomError(escrow, "CannotHireYourself");
      });

      it("Should revert when durationDays is zero", async function () {
        const { escrowFactory, owner, worker, escrow } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner,
            workerAddress: worker.address,
            durationDays: 0n,
          }),
        ).to.be.revertedWithCustomError(escrow, "ZeroDuration");
      });

      it("Should revert when title is empty", async function () {
        const { escrowFactory, owner, worker, escrow } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner,
            workerAddress: worker.address,
            title: "",
          }),
        ).to.be.revertedWithCustomError(escrow, "EmptyTitle");
      });

      it("Should revert when title length using ASCII exceeds MAX_TITLE_LENGTH", async function () {
        const { escrowFactory, owner, worker, escrow } =
          await networkHelpers.loadFixture(
            deployEscrowFactoryWithDefaultEscrowFixture,
          );

        const maxLength = await escrow.MAX_TITLE_LENGTH();
        const exceedingTitle = "a".repeat(Number(maxLength + 1n));

        expect(getUtf8ByteLength(exceedingTitle)).to.equal(maxLength + 1n);
        await expect(
          sendCreateEscrow({
            escrowFactory,
            owner,
            workerAddress: worker.address,
            title: exceedingTitle,
          }),
        )
          .to.be.revertedWithCustomError(escrow, "TitleTooLong")
          .withArgs(getUtf8ByteLength(exceedingTitle), maxLength);
      });

      describe("UTF-8 title length", function () {
        it("Should revert when MAX_TITLE_LENGTH + 1 bytes using an accented character", async function () {
          const { escrowFactory, owner, worker, escrow } =
            await networkHelpers.loadFixture(
              deployEscrowFactoryWithDefaultEscrowFixture,
            );

          const maxLength = await escrow.MAX_TITLE_LENGTH();
          const exceedingTitleWithAccent =
            "a".repeat(Number(maxLength - 1n)) + "á"; // 'á' ocupa 2 bytes

          expect(getUtf8ByteLength(exceedingTitleWithAccent)).to.equal(
            maxLength + 1n,
          );
          await expect(
            sendCreateEscrow({
              escrowFactory,
              owner,
              workerAddress: worker.address,
              title: exceedingTitleWithAccent,
            }),
          )
            .to.be.revertedWithCustomError(escrow, "TitleTooLong")
            .withArgs(
              getUtf8ByteLength(exceedingTitleWithAccent), // Se usa para sacar el length en bytes y no la cantidad caracteres unicode (ej.: 'á' es 1 caracter unicode pero 2 bytes)
              maxLength,
            );
        });

        it("Should revert when MAX_TITLE_LENGTH + 1 bytes using an emoji", async function () {
          const { escrowFactory, owner, worker, escrow } =
            await networkHelpers.loadFixture(
              deployEscrowFactoryWithDefaultEscrowFixture,
            );

          const maxLength = await escrow.MAX_TITLE_LENGTH();
          const exceedingTitleWithEmoji =
            "a".repeat(Number(maxLength - 3n)) + "😎"; // '😎' ocupa 4 bytes

          expect(getUtf8ByteLength(exceedingTitleWithEmoji)).to.equal(
            maxLength + 1n,
          );
          await expect(
            sendCreateEscrow({
              escrowFactory,
              owner,
              workerAddress: worker.address,
              title: exceedingTitleWithEmoji,
            }),
          )
            .to.be.revertedWithCustomError(escrow, "TitleTooLong")
            .withArgs(getUtf8ByteLength(exceedingTitleWithEmoji), maxLength);
        });
      });
    });
  });
});
