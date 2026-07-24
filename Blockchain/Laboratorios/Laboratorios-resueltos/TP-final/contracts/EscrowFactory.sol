// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.36;

import {Escrow} from "./Escrow.sol";
import {
    NoEthProvided,
    AddressZero,
    CannotHireYourself
} from "./EscrowErrores.sol";

/**
 * Se emite cuando se crea un contrato
 * @param escrowAddress La dirección del nuevo contrato
 * @param owner Dueño del nuevo contrato
 * @param worker Trabajador del nuevo contrato
 * @param amount Cantidad de ETH en wei del nuevo contrato
 */
event EscrowCreated(
    address indexed escrowAddress,
    address indexed owner,
    address indexed worker,
    uint amount
);

contract EscrowFactory {
    mapping(address owner => address[] escrows) public escrowsByOwner;
    mapping(address worker => address[] escrows) public escrowsByWorker;
    // TODO - ALL ESCROWS ARRAY?

    /**
     * @param worker Dirección de quien realizará el trabajo y recibirá el pago
     */
    function createEscrow(
        address worker
    ) external payable returns (address escrowAddress) {
        if (msg.value == 0) {
            revert NoEthProvided();
        }

        if (worker == address(0)) {
            revert AddressZero();
        }

        if (msg.sender == worker) {
            revert CannotHireYourself();
        }

        escrowAddress = address(
            new Escrow{value: msg.value}({owner_: msg.sender, worker_: worker})
        );

        escrowsByOwner[msg.sender].push(escrowAddress);
        escrowsByWorker[worker].push(escrowAddress);

        emit EscrowCreated({
            escrowAddress: escrowAddress,
            owner: msg.sender,
            worker: worker,
            amount: msg.value
        });

        return escrowAddress;
    }
}
