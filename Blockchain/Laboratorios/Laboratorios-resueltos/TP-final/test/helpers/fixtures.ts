import { createEscrow } from "./createEscrow.js";
import { ethers } from "./globals.js";
import {
  advanceToPendingSubmission,
  advanceToPendingReview,
  advanceToPendingArbitration,
} from "./transitions.js";

/**
 * Despliega una instancia de `EscrowFactory` y crea un escrow utilizando los valores predeterminados de `createEscrow`.
 *
 * Uso como fixture: `const deployAndCreateResult = await networkHelpers.loadFixture(defaultEscrowFixture);`
 *
 * @returns La factory, los signers y los valores retornados por createEscrow.
 */
export async function defaultEscrowFixture() {
  const [owner, worker, arbiter, ...otherAccounts] = await ethers.getSigners();
  const escrowFactory = await ethers.deployContract("EscrowFactory");

  await escrowFactory.waitForDeployment();

  const createResult = await createEscrow({
    escrowFactory: escrowFactory,
    owner: owner,
    workerAddress: worker.address,
    arbiterAddress: arbiter.address,
  });

  return {
    owner,
    worker,
    arbiter,
    otherAccounts,
    escrowFactory,
    ...createResult,
  };
}

/**
 * Despliega y acepta un escrow, dejándolo en PendingSubmission.
 */
export async function pendingSubmissionFixture() {
  const context = await defaultEscrowFixture();

  return advanceToPendingSubmission(context);
}

/**
 * Despliega, acepta y entrega el trabajo,
 * dejando el escrow en PendingReview.
 */
export async function pendingReviewFixture() {
  const context = await pendingSubmissionFixture();

  return advanceToPendingReview(context);
}

/**
 * Despliega, acepta, entrega el trabajo y abre una disputa,
 * dejando el escrow en PendingArbitration.
 */
export async function pendingArbitrationFixture() {
  const context = await pendingReviewFixture();

  return advanceToPendingArbitration(context);
}
