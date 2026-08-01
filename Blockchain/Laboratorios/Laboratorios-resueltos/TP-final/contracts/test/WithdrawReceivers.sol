// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.36;

/**
 * Interfaz que representa las acciones necesarias de un Escrow
 */
interface IEscrowForWithdrawTest {
    function acceptEscrow() external;

    function submitWork(string calldata submissionReference) external;

    function withdraw() external;
}

abstract contract TestWorker {
    IEscrowForWithdrawTest public escrow;

    function setEscrow(address escrow_) external {
        escrow = IEscrowForWithdrawTest(escrow_);
    }

    function acceptEscrow() external {
        escrow.acceptEscrow();
    }

    function submitWork(string calldata submissionReference) external {
        escrow.submitWork(submissionReference);
    }

    function withdraw() external virtual;
}

/**
 * Recibe el pago e intenta ejecutar withdraw nuevamente.
 * Atrapa el revert para que el primer retiro pueda completarse.
 */
contract ReentrantWorker is TestWorker {
    uint256 public receiveCalls;
    bool public reentrySucceeded;
    bytes public reentryRevertData;

    function withdraw() external override {
        escrow.withdraw();
    }

    receive() external payable {
        receiveCalls++;

        if (receiveCalls == 1) {
            try escrow.withdraw() {
                reentrySucceeded = true;
            } catch (bytes memory reason) {
                reentryRevertData = reason;
            }
        }
    }
}

/**
 * Puede llamar al escrow, pero no puede recibir ETH porque no
 * implementa receive ni fallback payable.
 */
contract NonPayableWorker is TestWorker {
    function withdraw() external override {
        escrow.withdraw();
    }
}
