// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.36;

import {Escrow} from "./Escrow.sol";

contract EscrowFactory {
    mapping(address owner => address[] escrows) public escrowsByOwner;
    mapping(address worker => address[] escrows) public escrowsByWorker;
    mapping(address arbiter => address[] escrows) public escrowsByArbiter;
    address[] public allEscrows;

    /**
     * Se emite cuando se crea un contrato
     * @param owner Dueño del nuevo contrato
     * @param worker Trabajador del nuevo contrato
     * @param arbiter Arbitro del nuevo contrato
     * @param escrowAddress La dirección del nuevo contrato
     * @param amount Cantidad de ETH en wei del nuevo contrato
     * @param acceptanceDuration Duración del período de aceptación del escrow en segundos
     * @param submissionDuration Duración del período de elaboración del trabajo en segundos
     * @param reviewDuration Duración del período de revisión del trabajo en segundos
     * @param arbitrationDuration Duración del período de arbitraje en segundos
     */
    event EscrowCreated(
        address indexed owner,
        address indexed worker,
        address indexed arbiter,
        address escrowAddress,
        uint256 amount,
        uint256 acceptanceDuration,
        uint256 submissionDuration,
        uint256 reviewDuration,
        uint256 arbitrationDuration
    );

    /**
     * @param worker_ Dirección de quien realizará el trabajo y recibirá el pago
     * @param worker_ Dirección de quien realizará el arbitraje de ser necesario
     * @param acceptanceDuration_ Duración del período de aceptación del escrow en segundos
     * @param submissionDuration_ Duración del período de elaboración del trabajo en segundos
     * @param reviewDuration_ Duración del período de revisión del trabajo en segundos
     * @param arbitrationDuration_ Duración del período de arbitraje en segundos
     * @param title_ Título del contrato. Entre 1 y `Escrow.MAX_TITLE_LENGTH` bytes
     */
    function createEscrow(
        address worker_,
        address arbiter_,
        uint256 acceptanceDuration_,
        uint256 submissionDuration_,
        uint256 reviewDuration_,
        uint256 arbitrationDuration_,
        string calldata title_
    ) external payable returns (address escrowAddress) {
        escrowAddress = address(
            new Escrow{value: msg.value}({
                owner_: msg.sender,
                worker_: worker_,
                arbiter_: arbiter_,
                acceptanceDuration_: acceptanceDuration_,
                submissionDuration_: submissionDuration_,
                reviewDuration_: reviewDuration_,
                arbitrationDuration_: arbitrationDuration_,
                title_: title_
            })
        );

        escrowsByOwner[msg.sender].push(escrowAddress);
        escrowsByWorker[worker_].push(escrowAddress);
        escrowsByArbiter[arbiter_].push(escrowAddress);
        allEscrows.push(escrowAddress);

        emit EscrowCreated({
            owner: msg.sender,
            worker: worker_,
            arbiter: arbiter_,
            escrowAddress: escrowAddress,
            amount: msg.value,
            acceptanceDuration: acceptanceDuration_,
            submissionDuration: submissionDuration_,
            reviewDuration: reviewDuration_,
            arbitrationDuration: arbitrationDuration_
        });
    }

    function getEscrowCountByOwner(
        address owner
    ) external view returns (uint256) {
        return escrowsByOwner[owner].length;
    }

    function getEscrowCountByWorker(
        address worker
    ) external view returns (uint256) {
        return escrowsByWorker[worker].length;
    }

    function getEscrowCountByArbiter(
        address arbiter
    ) external view returns (uint256) {
        return escrowsByArbiter[arbiter].length;
    }

    function getEscrowCount() external view returns (uint256) {
        return allEscrows.length;
    }
}
