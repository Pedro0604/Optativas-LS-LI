import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/types";
import type { EscrowFactory } from "../../types/ethers-contracts/EscrowFactory.js";
import type { AddressLike } from "ethers";
import { ethers, SECONDS_PER_DAY } from "./globals.js";

/**
 * Parámetros para crear un nuevo contrato `Escrow` mediante `EscrowFactory`.
 */
export type CreateEscrowParams = {
  escrowFactory: EscrowFactory;
  owner: HardhatEthersSigner;
  workerAddress: AddressLike;
  arbiterAddress: AddressLike;
  amountInEth?: bigint;
  acceptanceDuration?: bigint;
  submissionDuration?: bigint;
  reviewDuration?: bigint;
  arbitrationDuration?: bigint;
  title?: string;
};

/**
 * Envía una transacción para crear un nuevo contrato `Escrow`.
 *
 * Esta función solo realiza la llamada a `EscrowFactory.createEscrow` y
 * devuelve la respuesta de la transacción. No awaitea que sea minada.
 *
 * Es usada por createEscrow (ver abajo) y para tests que esperan que la
 * transacción revierta, ya que si se espera que se mine la transacción,
 * la misma revierte y no se catchea o espera con expect().to.revert(ethers);
 * entonces el test falla.
 *
 * @param params Parámetros de creación del escrow.
 * @returns La respuesta de la transacción enviada.
 */
export function sendCreateEscrow({
  escrowFactory,
  owner,
  workerAddress,
  arbiterAddress,
  amountInEth = 1n,
  acceptanceDuration = SECONDS_PER_DAY,
  submissionDuration = SECONDS_PER_DAY,
  reviewDuration = SECONDS_PER_DAY,
  arbitrationDuration = SECONDS_PER_DAY,
  title = "Escrow de prueba",
}: CreateEscrowParams) {
  return escrowFactory
    .connect(owner)
    .createEscrow(
      workerAddress,
      arbiterAddress,
      acceptanceDuration,
      submissionDuration,
      reviewDuration,
      arbitrationDuration,
      title,
      {
        value: ethers.parseEther(String(amountInEth)),
      },
    );
}

/**
 * Ejecuta la creación exitosa de un nuevo contrato `Escrow`.
 *
 * Primero se usa `staticCall` para obtener la dirección del contrato creado.
 * Después envía la transacción real y se espera a que sea minada.
 *
 * Para tests donde se espera un revert se debe usar `sendCreateEscrow` (ver arriba).
 *
 * @param params Parámetros de creación del escrow.
 * @returns La transacción, su recibo, la dirección del escrow creado y los
 * valores utilizados durante la creación.
 *
 * @throws Si la transacción no produce un recibo al esperar que se mine.
 */
export async function createEscrow({
  escrowFactory,
  owner,
  workerAddress,
  arbiterAddress,
  amountInEth = 1n,
  acceptanceDuration = SECONDS_PER_DAY,
  submissionDuration = SECONDS_PER_DAY,
  reviewDuration = SECONDS_PER_DAY,
  arbitrationDuration = SECONDS_PER_DAY,
  title = "Escrow de prueba",
}: CreateEscrowParams) {
  const amountInWei = ethers.parseEther(String(amountInEth));

  const escrowAddress = await escrowFactory
    .connect(owner)
    .createEscrow.staticCall(
      workerAddress,
      arbiterAddress,
      acceptanceDuration,
      submissionDuration,
      reviewDuration,
      arbitrationDuration,
      title,
      {
        value: amountInWei,
      },
    );

  const transaction = await sendCreateEscrow({
    escrowFactory,
    owner,
    workerAddress,
    arbiterAddress,
    amountInEth,
    acceptanceDuration,
    submissionDuration,
    reviewDuration,
    arbitrationDuration,
    title,
  });

  const receipt = await transaction.wait();

  if (receipt === null) {
    throw new Error("La transacción de creación no fue minada");
  }

  const escrow = await ethers.getContractAt("Escrow", escrowAddress);

  return {
    transaction,
    receipt,
    escrowAddress,
    escrow,
    amountInEth,
    amountInWei,
    acceptanceDuration,
    submissionDuration,
    reviewDuration,
    arbitrationDuration,
    title,
  };
}
