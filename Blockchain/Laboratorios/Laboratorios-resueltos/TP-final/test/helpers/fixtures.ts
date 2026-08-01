import type {
  NonPayableWorker,
  ReentrantWorker,
} from "../../types/ethers-contracts/index.js";
import { createEscrow } from "./createEscrow.js";
import { ethers } from "./globals.js";
import { setNextBlockAt } from "./time.js";
import {
  advanceToPendingSubmission,
  advanceToPendingReview,
  advanceToPendingArbitration,
  DEFAULT_SUBMISSION_REFERENCE,
  DEFAULT_DISPUTE_REASON,
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

/**
 * Crea un escrow cuyo worker es un contrato auxiliar de testing.
 *
 * Deja el escrow en ArbitrationExpired y con el monto completo acreditado
 * en pendingWithdrawals al contrato auxiliar.
 *
 * Se deja en ArbitrationExpired para que el contrato tenga más balance
 * que el pendiente para el worker (la mitad la tiene el worker y la otra el owner)
 */
async function withdrawalContractFixture(
  workerContractName: "ReentrantWorker" | "NonPayableWorker",
) {
  const [owner, arbiter, ...otherAccounts] = await ethers.getSigners();

  const escrowFactory = await ethers.deployContract("EscrowFactory");
  await escrowFactory.waitForDeployment();

  // Debe desplegarse antes de crear el escrow porque su dirección
  //  será utilizada como worker.

  // No se usa directamente await ethers.deployContract(workerContractName);
  //  porque se pierde el tipado del withdrawalWorker
  let withdrawalWorker: ReentrantWorker | NonPayableWorker;
  if (workerContractName == "ReentrantWorker") {
    withdrawalWorker = await ethers.deployContract(workerContractName);
  } else {
    withdrawalWorker = await ethers.deployContract(workerContractName);
  }
  await withdrawalWorker.waitForDeployment();
  const withdrawalWorkerAddress = await withdrawalWorker.getAddress();

  const createResult = await createEscrow({
    escrowFactory,
    owner,
    workerAddress: withdrawalWorkerAddress,
    arbiterAddress: arbiter.address,
  });

  const { escrow, escrowAddress } = createResult;

  await withdrawalWorker.setEscrow(escrowAddress);
  await withdrawalWorker.acceptEscrow();
  await withdrawalWorker.submitWork(DEFAULT_SUBMISSION_REFERENCE);
  await escrow.connect(owner).openDispute(DEFAULT_DISPUTE_REASON);
  setNextBlockAt(escrow.arbitrationDeadline());
  await escrow.expireArbitration();

  return {
    owner,
    arbiter,
    otherAccounts,
    escrowFactory,
    withdrawalWorker,
    withdrawalWorkerAddress,
    ...createResult,
  };
}

/**
 * Deja un escrow en ArbitrationExpired, cuyo worker intenta realizar
 * una llamada reentrante durante withdraw.
 */
export async function reentrantWithdrawalFixture() {
  const { withdrawalWorker, withdrawalWorkerAddress, ...context } =
    await withdrawalContractFixture("ReentrantWorker");

  return {
    ...context,
    reentrantWorker: withdrawalWorker as ReentrantWorker,
    reentrantWorkerAddress: withdrawalWorkerAddress,
  };
}

/**
 * Deja un escrow en ArbitrationExpired, cuyo worker no implementa
 * receive ni fallback payable.
 */
export async function nonPayableWithdrawalFixture() {
  const { withdrawalWorker, withdrawalWorkerAddress, ...context } =
    await withdrawalContractFixture("NonPayableWorker");

  return {
    ...context,
    nonPayableWorker: withdrawalWorker as NonPayableWorker,
    nonPayableWorkerAddress: withdrawalWorkerAddress,
  };
}
