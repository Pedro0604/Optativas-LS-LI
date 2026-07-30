// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.36;

contract Escrow {
    // Declaraciones de tipos
    /**
     * El estado del contrato.
     */
    enum State {
        // Estados no finales
        PendingAcceptance,
        Active,
        PendingReview,
        Disputed,
        // Estados finales
        Cancelled,
        AcceptanceExpired,
        DeliveryExpired,
        Approved,
        ReviewExpired,
        Resolved,
        ArbitrationExpired
    }

    // Variables de estado
    // Constantes
    uint256 public constant MAX_TITLE_LENGTH = 64;
    uint256 public constant MAX_DELIVERY_REFERENCE_LENGTH = 256;
    uint256 public constant MAX_DISPUTE_REASON_LENGTH = 256;
    uint256 public constant MAX_RESOLUTION_REASON_LENGTH = 256;

    // Inmutables
    address public immutable worker;
    uint256 public immutable deadline;
    uint256 public immutable amount;
    address public immutable owner;

    // Mutables
    State public state;
    string public title;

    // Eventos
    // Eventos desde el estado PendingAcceptance
    /**
     * El Escrow fue aceptado por el worker
     *
     * Transiciona a estado Active
     *
     * @param deliveryDeadline Fecha límite de entrega de trabajo
     */
    event Accepted(uint256 deliveryDeadline);

    /**
     * El período de aceptación expiró
     * 
     * Transiciona a estado AcceptanceExpired
     *
     */
    event AcceptanceExpired();

    /**
     * El escrow fue cancelado por el owner antes de la aceptación
     *
     * Transiciona a estado Cancelled
     */
    event Cancelled();

    // Eventos desde el estado Active
    /**
     * El trabajo fue entregado por el worker
     *
     * Transiciona a estado PendingReview
     *
     * @param reviewDeadline Fecha límite de revisión del trabajo
     */
    event WorkSubmitted(uint256 reviewDeadline);

    /**
     * El período de entrega del trabajo expiró
     *
     * Transiciona a estado DeliveryExpired
     */
    event DeliveryExpired();

    // Eventos desde el estado PendingReview
    /**
     * El trabajo fue aprobado por el owner
     *
     * Transiciona a estado Approved
     */
    event WorkApproved();

    /**
     * El período de revisión del trabajo expiró
     *
     * Transiciona a estado ReviewExpired
     */
    event ReviewExpired();

    /**
     * El trabajo fue disputado por el owner
     *
     * Transiciona a estado Disputed
     *
     * @param arbitrationDeadline Fecha límite de resolución de la disputa
     */
    event DisputeOpened(uint256 arbitrationDeadline);

    // Eventos desde el estado Disputed
    /**
     * La disputa fue resuelta
     *
     * Transiciona a estado Resolved
     *
     * @param ownerAmount Cantidad correspondiente al owner en wei
     * @param workerAmount Cantidad correspondiente al worker en wei
     */
    event DisputeResolved(uint256 ownerAmount, uint256 workerAmount);

    /**
     * El período de resolución de la disputa expiró
     *
     * Transiciona a estado ArbitrationExpired
     */
    event ArbitrationExpired();

    /**
     * Se retiraron fondos del contrato
     *
     * @param account Cuenta que retira fondos (del worker o del owner)
     * @param amount Cantidad de fondos retirados en wei
     */
    event FundsWithdrawn(address indexed account, uint256 amount);

    // Errores
    /**
     * Estado invalido.
     * @param currentState Estado actual
     * @param expectedState Estado esperado
     */
    error InvalidState(State currentState, State expectedState);

    /**
     * Solo el dueño puede realizar la función
     */
    error OnlyOwnerAllowed();

    /**
     * Solo el worker puede realizar la función
     */
    error OnlyWorkerAllowed();

    /**
     * Solo se permite interactuar con esta función después del tiempo definido
     * @param allowedAfterTime Tiempo a partir del cual se puede interactuar con la función
     */
    error OnlyAllowedAfterTime(uint256 allowedAfterTime);

    /**
     * Solo se permite interactuar con esta función antes del tiempo definido
     * @param allowedBeforeTime Tiempo hasta el cual se puede interactuar con la función
     */
    error OnlyAllowedBeforeTime(uint256 allowedBeforeTime);

    /**
     * No se proveyó nada de ETH para realizar la creación de un nuevo contrato
     */
    error NoEthProvided();

    /**
     * La dirección indicada es la address(0)
     */
    error ZeroAddress();

    /**
     * No se puede contratarse a uno mismo
     */
    error CannotHireYourself();

    /**
     * La duración del contrato no puede ser 0
     */
    error ZeroDuration();

    /**
     * El título del contrato no puede estar vacío
     */
    error EmptyTitle();

    /**
     * El título del contrato no puede superar los `MAX_TITLE_LENGTH` bytes (caracteres utf-8 ocupan 1 byte, caracteres con tilde, emojis y otros tipos de caracteres ocupan más de 1 byte)
     * @param currentLength Longitud del título provisto
     * @param maxLength Longitud máxima permitida
     */
    error TitleTooLong(uint256 currentLength, uint256 maxLength);

    // Modificadores
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

    modifier onlyWorker() {
        if (msg.sender != worker) {
            revert OnlyWorkerAllowed();
        }
        _;
    }

    modifier onlyAfter(uint256 time) {
        if (block.timestamp < time) {
            revert OnlyAllowedAfterTime({allowedAfterTime: time});
        }
        _;
    }

    modifier onlyBefore(uint256 time) {
        if (block.timestamp >= time) {
            revert OnlyAllowedBeforeTime({allowedBeforeTime: time});
        }
        _;
    }

    // Funciones
    /**
     * @param owner_ Dueño del contrato
     * @param worker_ Dirección de quien realizará el trabajo y recibirá el pago
     * @param durationDays Límite de tiempo en días para realizar el contrato
     * @param title_ Título del contrato. Entre 1 y `MAX_TITLE_LENGTH` bytes
     */
    constructor(
        address owner_,
        address worker_,
        uint256 durationDays,
        string memory title_
    ) payable {
        if (msg.value == 0) {
            revert NoEthProvided();
        }

        if (owner_ == address(0) || worker_ == address(0)) {
            revert ZeroAddress();
        }

        if (owner_ == worker_) {
            revert CannotHireYourself();
        }

        if (durationDays == 0) {
            revert ZeroDuration();
        }

        uint256 titleLength = bytes(title_).length;

        if (titleLength == 0) {
            revert EmptyTitle();
        }

        if (titleLength > MAX_TITLE_LENGTH) {
            revert TitleTooLong({
                currentLength: titleLength,
                maxLength: MAX_TITLE_LENGTH
            });
        }

        owner = owner_;
        worker = worker_;
        amount = msg.value;
        deadline = block.timestamp + durationDays * 1 days;
        title = title_;

        state = State.PendingAcceptance;
    }

    function accept() external onlyWorker inState(State.PendingAcceptance) {
        state = State.Active;
        emit Accepted(1); // TODO - REEMPLAZAR EL 1 POR LA DELIVERY_DEADLINE
    }
}
