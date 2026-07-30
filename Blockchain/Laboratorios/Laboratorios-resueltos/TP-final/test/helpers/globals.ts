import { network } from "hardhat";

/**
 * Instancias de Ethers y de los helpers de red asociadas a la conexión
 * utilizada por los tests.
 */
export const { ethers, networkHelpers } = await network.create();

/**
 * Segundos en un día
 */
export const SECONDS_PER_DAY = 86_400n;
