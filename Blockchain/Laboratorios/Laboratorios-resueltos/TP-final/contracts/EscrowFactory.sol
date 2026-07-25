// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.36;

import {Escrow} from "./Escrow.sol";

contract EscrowFactory {
    mapping(address owner => address[] escrows) public escrowsByOwner;
    mapping(address worker => address[] escrows) public escrowsByWorker;
    // TODO - ALL ESCROWS ARRAY?

    /**
     * Se emite cuando se crea un contrato
     * @param escrowAddress La dirección del nuevo contrato
     * @param owner Dueño del nuevo contrato
     * @param worker Trabajador del nuevo contrato
     * @param amount Cantidad de ETH en wei del nuevo contrato
     * @param durationDays Duración del contrato en días
     */
    event EscrowCreated(
        address indexed escrowAddress,
        address indexed owner,
        address indexed worker,
        uint256 amount,
        uint256 durationDays
    );

    /**
     * @param worker_ Dirección de quien realizará el trabajo y recibirá el pago
     * @param durationDays_ Límite de tiempo en días para realizar el contrato
     * @param title_ Título del contrato. Entre 1 y `Escrow.MAX_TITLE_LENGTH` bytes
     */
    function createEscrow(
        address worker_,
        uint256 durationDays_,
        string memory title_
    ) external payable returns (address escrowAddress) {
        escrowAddress = address(
            new Escrow{value: msg.value}({
                owner_: msg.sender,
                worker_: worker_,
                durationDays: durationDays_,
                title_: title_
            })
        );

        escrowsByOwner[msg.sender].push(escrowAddress);
        escrowsByWorker[worker_].push(escrowAddress);

        emit EscrowCreated({
            escrowAddress: escrowAddress,
            owner: msg.sender,
            worker: worker_,
            amount: msg.value,
            durationDays: durationDays_
        });
    }

    function getEscrowCountByOwner(address owner) external view returns (uint256) {
        return escrowsByOwner[owner].length;
    }

    function getEscrowCountByWorker(address worker) external view returns (uint256) {
        return escrowsByWorker[worker].length;
    }
}
