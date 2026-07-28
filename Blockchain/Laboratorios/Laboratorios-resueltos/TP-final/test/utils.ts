import type { EscrowFactory } from "../types/ethers-contracts/EscrowFactory.js";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/types";
import type { AddressLike, BigNumberish } from "ethers";
import { network } from "hardhat";

/**
 * Instancias de Ethers y de los helpers de red asociadas a la conexión
 * utilizada por los tests.
 */
export const { ethers, networkHelpers } = await network.create();

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
  const [owner, worker, otherAccount] = await ethers.getSigners();
  const escrowFactory = await ethers.deployContract("EscrowFactory");

  await escrowFactory.waitForDeployment();

  return {
    escrowFactory,
    owner,
    worker,
    otherAccount,
  };
}

/**
 * Parámetros para crear un nuevo contrato `Escrow` mediante `EscrowFactory`.
 */
export type CreateEscrowParams = {
  escrowFactory: EscrowFactory;
  owner: HardhatEthersSigner;
  workerAddress: AddressLike;
  amountInEth?: number;
  durationDays?: BigNumberish;
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
  amountInEth = 1,
  durationDays = 30,
  title = "Escrow de prueba",
}: CreateEscrowParams) {
  return escrowFactory
    .connect(owner)
    .createEscrow(workerAddress, durationDays, title, {
      value: ethers.parseEther(String(amountInEth)),
    });
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
  amountInEth = 1,
  durationDays = 30,
  title = "Escrow de prueba",
}: CreateEscrowParams) {
  const amountInWei = ethers.parseEther(String(amountInEth));

  const escrowAddress = await escrowFactory
    .connect(owner)
    .createEscrow.staticCall(workerAddress, durationDays, title, {
      value: amountInWei,
    });

  const transaction = await sendCreateEscrow({
    escrowFactory,
    owner,
    workerAddress,
    amountInEth,
    durationDays,
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
    durationDays,
    title,
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
  });

  return {
    ...deployResult,
    ...createResult,
  };
}

/**
 * Representación del enum `Escrow.State` definido en `Escrow.sol`.
 *
 * Los valores deben coincidir exactamente con el orden de declaración del enum,
 * ya que Solidity asigna valores enteros consecutivos a partir del 0.
 *
 * @warning Si se agrega, elimina o reordena el enum `Escrow.State` de `Escrow.sol`,
 * este objeto también debe actualizarse.
 */
export const EscrowState = {
  Funded: 0n,
  Accepted: 1n,
  Delivered: 2n,
  Approved: 3n,
  Disputed: 4n,
  Paid: 5n,
  Refunded: 6n,
  Resolved: 7n,
} as const;

/**
 * Obtiene la length del string en bytes, usando ethers.toUtf8Bytes
 * @param str String a obtener su length
 * @returns Length como BigInt
 */
export function getUtf8ByteLength(str: string) {
  return BigInt(ethers.toUtf8Bytes(str).length);
}
