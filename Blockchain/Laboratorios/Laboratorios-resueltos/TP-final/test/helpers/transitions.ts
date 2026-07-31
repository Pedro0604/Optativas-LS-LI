import { ethers, WeiPerEther } from "ethers";
import type { defaultEscrowFixture } from "./fixtures.js";

export type PendingAcceptanceContext = Awaited<
  ReturnType<typeof defaultEscrowFixture>
>;

export const DEFAULT_SUBMISSION_REFERENCE = "ipfs://envio-de-referencia";

export const DEFAULT_DISPUTE_REASON =
  "El trabajo enviado no resuelve todo lo pedido.";

export const DEFAULT_RESOLUTION_REASON = "El owner está mintiendo.";

/**
 * Acepta el escrow y lo lleva a PendingSubmission.
 */
export async function advanceToPendingSubmission(
  context: PendingAcceptanceContext,
) {
  const transaction = await context.escrow
    .connect(context.worker)
    .acceptEscrow();

  const receipt = await transaction.wait();

  return {
    ...context,
    acceptanceTransaction: transaction,
    acceptanceReceipt: receipt,
    submissionDeadline: await context.escrow.submissionDeadline(),
  };
}

export type PendingSubmissionContext = Awaited<
  ReturnType<typeof advanceToPendingSubmission>
>;

/**
 * Entrega el trabajo y lleva el escrow a PendingReview.
 */
export async function advanceToPendingReview(
  context: PendingSubmissionContext,
  submissionReference = DEFAULT_SUBMISSION_REFERENCE,
) {
  const transaction = await context.escrow
    .connect(context.worker)
    .submitWork(submissionReference);

  const receipt = await transaction.wait();

  return {
    ...context,
    submissionReference,
    submissionTransaction: transaction,
    submissionReceipt: receipt,
    reviewDeadline: await context.escrow.reviewDeadline(),
  };
}

export type PendingReviewContext = Awaited<
  ReturnType<typeof advanceToPendingReview>
>;

/**
 * Abre una disputa y lleva el escrow a PendingArbitration.
 */
export async function advanceToPendingArbitration(
  context: PendingReviewContext,
  disputeReason = DEFAULT_DISPUTE_REASON,
) {
  const transaction = await context.escrow
    .connect(context.owner)
    .openDispute(disputeReason);

  const receipt = await transaction.wait();

  return {
    ...context,
    disputeReason,
    disputeTransaction: transaction,
    disputeReceipt: receipt,
    arbitrationDeadline: await context.escrow.arbitrationDeadline(),
  };
}

export type PendingArbitrationContext = Awaited<
  ReturnType<typeof advanceToPendingArbitration>
>;
