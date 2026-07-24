// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.36;

/**
 * No se proveyó nada de ETH para realizar la creación de un nuevo contrato
 */
error NoEthProvided();

/**
 * La dirección indicada es la 0
 */
error AddressZero();

/// No se puede contratarse a uno mismo
error CannotHireYourself();