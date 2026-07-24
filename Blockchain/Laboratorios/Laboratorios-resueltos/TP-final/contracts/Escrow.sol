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

/**
 * No se puede contratarse a uno mismo
 */
error CannotHireYourself();

/**
 * La duración del contrato no puede ser 0
 */
error ZeroDuration();

contract Escrow {
    /**
     * El estado del contrato.
     * @dev El valor default es State.Financed
     */
    enum State {
        Financed,
        Accepted,
        Delivered,
        Approved,
        Disputed,
        Paid,
        Refunded,
        Resolved
    }

    State public state;
    address public immutable worker;
    uint256 public immutable endTime; // TODO - Definir máx durationDays(?
    uint256 public immutable amount;
    address public immutable owner;

    /**
     * Solo el dueño puede realizar la función
     */
    error OnlyOwnerAllowed();

    /**
     * Estado invalido.
     * @param currentState Estado actual
     * @param expectedState Estado esperado
     */
    error InvalidState(State currentState, State expectedState);

    modifier inState(State expectedState) {
        if (state != expectedState) {
            revert InvalidState({
                currentState: state,
                expectedState: expectedState
            });
        }
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert OnlyOwnerAllowed();
        }
        _;
    }

    /**
     * @param owner_ Dueño del contrato
     * @param worker_ Dirección de quien realizará el trabajo y recibirá el pago
     * @param durationDays Límite de tiempo en días para realizar el contrato
     */
    constructor(address owner_, address worker_, uint256 durationDays) payable {
        if (msg.value == 0) {
            revert NoEthProvided();
        }

        if (owner_ == address(0) || worker_ == address(0)) {
            revert AddressZero();
        }

        if (owner_ == worker_) {
            revert CannotHireYourself();
        }

        if (durationDays == 0) {
            revert ZeroDuration();
        }

        owner = owner_;
        worker = worker_;
        amount = msg.value;
        endTime = block.timestamp + durationDays * 1 days;

        state = State.Financed;
    }
}
