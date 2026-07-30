import { createEscrow } from "./createEscrow.js";
import { ethers } from "./globals.js";

/**
 * Despliega una nueva instancia de `EscrowFactory` y obtiene las cuentas
 * que se utilizarán como participantes durante los tests.
 *
 * Uso como fixture: `const deployResult = await networkHelpers.loadFixture(deployEscrowFactoryFixture);`
 *
 * @returns La factory desplegada y los signers predeterminados para el
 * owner, worker y una cuenta adicional.
 */
export async function deployEscrowFactoryFixture() {
  const [owner, worker, arbiter, otherAccount] = await ethers.getSigners();
  const escrowFactory = await ethers.deployContract("EscrowFactory");

  await escrowFactory.waitForDeployment();

  return {
    escrowFactory,
    owner,
    worker,
    arbiter,
    otherAccount,
  };
}

/**
 * Despliega una instancia de `EscrowFactory` y crea un escrow utilizando
 * los valores predeterminados de `createEscrow`.
 *
 * Uso como fixture: `const deployAndCreateResult = await networkHelpers.loadFixture(deployEscrowFactoryWithDefaultEscrowFixture);`
 *
 * @returns La factory, los signers, la transacción de creación, la dirección
 * del escrow y los valores utilizados para crearlo.
 */
export async function deployEscrowFactoryWithDefaultEscrowFixture() {
  const deployResult = await deployEscrowFactoryFixture();

  const createResult = await createEscrow({
    escrowFactory: deployResult.escrowFactory,
    owner: deployResult.owner,
    workerAddress: deployResult.worker.address,
    arbiterAddress: deployResult.arbiter.address,
  });

  return {
    ...deployResult,
    ...createResult,
  };
}
