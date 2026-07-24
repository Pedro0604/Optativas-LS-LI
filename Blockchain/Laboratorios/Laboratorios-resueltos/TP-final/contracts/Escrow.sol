// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

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

contract Owned {
    address public owner;

    /**
     * Solo el dueño puede realizar la función
     */
    error OnlyOwnerAllowed();

    constructor(address owner_) {
        owner = owner_;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert OnlyOwnerAllowed();
        }
        _;
    }
}

contract Escrow is Owned {
    /**
     * El estado del contrato.
     * @dev El valor default es el primero (State.Created)
     */
    enum State {
        Created, // Valor default
        Financed,
        Accepted,
        Delivered,
        Approved,
        Disputed,
        Ended
    }

    State state;
    address public worker;

    /**
     * Estado invalido.
     * @param currentState Estado actual
     * @param expectedState Estado esperado
     */
    error InvalidState(State currentState, State expectedState);

    modifier InState(State state_) {
        if (state != state_) {
            revert InvalidState({currentState: state, expectedState: state_});
        }
        _;
    }

    /**
     * @param owner_ Dueño del contrato
     * @param worker_ Dirección de quien realizará el trabajo y recibirá el pago
     */
    constructor(address owner_, address worker_) payable Owned(owner_) {
        if (msg.value == 0) {
            revert NoEthProvided();
        }

        if (owner_ == address(0) || worker_ == address(0)) {
            revert AddressZero();
        }

        if (owner_ == worker) {
            revert CannotHireYourself();
        }

        worker = worker_;
    }
}
