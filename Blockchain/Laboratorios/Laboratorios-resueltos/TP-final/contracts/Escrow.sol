// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.36;

contract Escrow {
    // Declaraciones de tipos
    /**
     * El estado del contrato.
     */
    enum State {
        // Estados no finales
        /**
         * El contrato fue creado y está pendiente de aceptación por parte del worker
         */
        PendingAcceptance,
        /**
         * El contrato fue aceptado por el worker y está pendiente de la entrega del trabajo por parte del worker
         */
        PendingSubmission,
        /**
         * El trabajo fue entregado y está pendiente de revisión por parte del owner
         */
        PendingReview,
        /**
         * El contrato fue disputado por el owner y está pendiente del arbitraje
         */
        PendingArbitration,
        // Estados finales
        /**
         * El contrato fue cancelado por el owner antes de ser aceptado por el worker
         */
        EscrowCancelled,
        /**
         * El período de aceptación del contrato expiró
         */
        AcceptanceExpired,
        /**
         * El período de entrega del trabajo expiró
         */
        SubmissionExpired,
        /**
         * El trabajo entregado fue aprovado por el owner
         */
        WorkApproved,
        /**
         * El período de revisión del trabajo expiró
         */
        ReviewExpired,
        /**
         * La disputa fue resuelta por el árbitro
         */
        DisputeResolved,
        /**
         * El período de arbitraje del contrato expiró
         */
        ArbitrationExpired
    }

    // Variables de estado
    // Constantes
    uint256 public constant MAX_TITLE_LENGTH = 64;
    uint256 public constant MAX_SUBMISSION_REFERENCE_LENGTH = 256;
    uint256 public constant MAX_DISPUTE_REASON_LENGTH = 256;
    uint256 public constant MAX_RESOLUTION_REASON_LENGTH = 256;

    // Inmutables
    address public immutable owner;
    address public immutable worker;
    address public immutable arbiter;

    uint256 public immutable amount;

    uint256 public immutable acceptanceDeadline;
    uint256 public immutable submissionDuration;
    uint256 public immutable reviewDuration;
    uint256 public immutable arbitrationDuration;

    // Mutables
    State public state;

    uint256 public submissionDeadline;
    uint256 public reviewDeadline;
    uint256 public arbitrationDeadline;

    string public title;
    string public submissionReference;
    string public disputeReason;
    string public resolutionReason;

    mapping(address account => uint256 amount) public pendingWithdrawals;

    // Eventos
    // Eventos desde el estado PendingAcceptance
    /**
     * El escrow fue aceptado por el worker
     *
     * Transiciona a estado PendingSubmission
     *
     * @param submissionDeadline Fecha límite de entrega de trabajo
     */
    event EscrowAccepted(uint256 submissionDeadline);

    /**
     * El período de aceptación expiró
     *
     * Transiciona a estado AcceptanceExpired
     */
    event AcceptanceExpired();

    /**
     * El escrow fue cancelado por el owner antes de la aceptación
     *
     * Transiciona a estado EscrowCancelled
     */
    event EscrowCancelled();

    // Eventos desde el estado PendingSubmission
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
     * Transiciona a estado SubmissionExpired
     */
    event SubmissionExpired();

    // Eventos desde el estado PendingReview
    /**
     * El trabajo fue aprobado por el owner
     *
     * Transiciona a estado WorkApproved
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
     * Transiciona a estado PendingArbitration
     *
     * @param arbitrationDeadline Fecha límite de resolución de la disputa
     */
    event DisputeOpened(uint256 arbitrationDeadline);

    // Eventos desde el estado PendingArbitration
    /**
     * La disputa fue resuelta
     *
     * Transiciona a estado DisputeResolved
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

    // Evento de retiro de fondos
    /**
     * Se retiraron fondos del contrato
     *
     * @param account Cuenta que retira fondos (del worker o del owner)
     * @param amount Cantidad de fondos retirados en wei
     */
    event FundsWithdrawn(address indexed account, uint256 amount);

    // Errores
    // Errores de estado y permisos
    /**
     * Estado inválido.
     *
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
     * Solo el arbitro puede realizar la función
     */
    error OnlyArbiterAllowed();

    // Errores de tiempo
    /**
     * Solo se permite interactuar con esta función después del tiempo definido
     *
     * @param allowedAfterTime Tiempo a partir del cual se puede interactuar con la función
     */
    error OnlyAllowedAfterTime(uint256 allowedAfterTime);

    /**
     * Solo se permite interactuar con esta función antes del tiempo definido
     *
     * @param allowedBeforeTime Tiempo hasta el cual se puede interactuar con la función
     */
    error OnlyAllowedBeforeTime(uint256 allowedBeforeTime);

    /**
     * La deadline ya expiró
     *
     * @param deadline Deadline expirada
     */
    error DeadlineAlreadyExpired(uint256 deadline);

    /**
     * La deadline aún no expiró
     *
     * @param deadline Deadline no expirada
     */
    error DeadlineNotExpiredYet(uint256 deadline);

    /**
     * La duración no puede ser 0
     */
    error ZeroDuration();

    // Errores de validación durante la creación
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
     * El árbitro no puede ser owner ni worker
     */
    error ArbiterCannotParticipate();

    // Errores de strings
    /**
     * El string no puede estar vacío
     */
    error EmptyString(); // TODO - VER SI AGREGAR UN STRING DE REFERENCIA E.G.: TITLE, DISPUTE_REASON, ETC. O DIVIDIR EN UN ERROR EMPTY Y MAX PARA CADA TIPO DE STRING

    /**
     * El string no puede superar `maxLength` bytes (caracteres utf-8 ocupan 1 byte, caracteres con tilde, emojis y otros tipos de caracteres ocupan más de 1 byte)
     *
     * @param currentLength Longitud del string provisto
     * @param maxLength Longitud máxima permitida
     */
    error StringTooLong(uint256 currentLength, uint256 maxLength);

    // Errores de resolución de disputa
    error WorkerAmountExceedsEscrow(uint256 workerAmount, uint256 escrowAmount);

    // Errores de withdraws
    error NoFundsToWithdraw();
    error WithdrawalFailed();

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

    // TODO - SI NO SON USADAS ONLY AFTER Y BEFORE, ELIMINARLAS Y ELIMINAR SUS ERRORES. ELIMINAR TAMBIEN LOS ERRORES DE ERRORS.TS
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

    modifier notExpired(uint256 deadline) {
        if (isExpired(deadline)) {
            revert DeadlineAlreadyExpired(deadline);
        }
        _;
    }

    modifier expired(uint256 deadline) {
        if (!isExpired(deadline)) {
            revert DeadlineNotExpiredYet(deadline);
        }
        _;
    }

    modifier textLengthOk(string memory text, uint256 max) {
        uint256 textLength = bytes(text).length;

        if (textLength == 0) {
            revert EmptyString();
        }

        if (textLength > max) {
            revert StringTooLong({currentLength: textLength, maxLength: max});
        }
        _;
    }

    // Funciones
    /**
     * @param owner_ Dueño del contrato
     * @param worker_ Dirección de quien realizará el trabajo y recibirá el pago
     * @param worker_ Dirección de quien realizará el arbitraje de ser necesario
     * @param acceptanceDuration_ Duración del período de aceptación del escrow en segundos
     * @param submissionDuration_ Duración del período de elaboración del trabajo en segundos
     * @param reviewDuration_ Duración del período de revisión del trabajo en segundos
     * @param arbitrationDuration_ Duración del período de arbitraje en segundos
     * @param title_ Título del contrato. Entre 1 y `Escrow.MAX_TITLE_LENGTH` bytes
     */
    constructor(
        address owner_,
        address worker_,
        address arbiter_,
        uint256 acceptanceDuration_,
        uint256 submissionDuration_,
        uint256 reviewDuration_,
        uint256 arbitrationDuration_,
        string memory title_
    ) payable textLengthOk(title_, MAX_TITLE_LENGTH) {
        if (msg.value == 0) {
            revert NoEthProvided();
        }

        if (
            owner_ == address(0) ||
            worker_ == address(0) ||
            arbiter_ == address(0)
        ) {
            revert ZeroAddress();
        }

        if (owner_ == worker_) {
            revert CannotHireYourself();
        }

        if (arbiter_ == owner_ || arbiter_ == worker_) {
            revert ArbiterCannotParticipate();
        }

        if (
            acceptanceDuration_ == 0 ||
            submissionDuration_ == 0 ||
            reviewDuration_ == 0 ||
            arbitrationDuration_ == 0
        ) {
            revert ZeroDuration(); // TODO - Revertir con errores específicos para cada uno(?
            // TODO - QUIZAS VALIDAR QUE ESTÉ ENTRE UN MIN Y UN MAX (12 HORAS Y 1 MES(?)
        }

        amount = msg.value;

        owner = owner_;
        worker = worker_;
        arbiter = arbiter_;

        acceptanceDeadline = block.timestamp + acceptanceDuration_ * 1 seconds;
        submissionDuration = submissionDuration_;
        reviewDuration = reviewDuration_;
        arbitrationDuration = arbitrationDuration_;

        title = title_;

        state = State.PendingAcceptance;
    }

    // External
    /**
     * Acepta un escrow.
     *
     * Requisitos:
     * - Solo lo puede ejecutar el worker.
     * - Debe estar en estado PendingAcceptance.
     * - Solo se puede ejecutar antes de acceptanceDeadline.
     *
     * Efectos:
     * - Transiciona de PendingAcceptance a PendingSubmission.
     * - Emite el evento EscrowAccepted.
     * - Calcula submissionDeadline.
     */
    function acceptEscrow()
        external
        onlyWorker
        inState(State.PendingAcceptance)
        notExpired(acceptanceDeadline)
    {
        state = State.PendingSubmission;
        submissionDeadline = block.timestamp + submissionDuration * 1 seconds;
        emit EscrowAccepted(submissionDeadline);
    }

    /**
     * Materializa la expiración del período de aceptación.
     *
     * Requisitos:
     * - Puede ser ejecutado por cualquier cuenta.
     * - Debe estar en estado PendingAcceptance.
     * - Solo se puede ejecutar después de acceptanceDeadline.
     *
     * Efectos:
     * - Acredita el amount completo al owner.
     * - Transiciona de PendingAcceptance a AcceptanceExpired.
     * - Emite el evento AcceptanceExpired.
     */
    function expireAcceptance()
        external
        inState(State.PendingAcceptance)
        expired(acceptanceDeadline)
    {
        pendingWithdrawals[owner] = amount;
        state = State.AcceptanceExpired;
        emit AcceptanceExpired();
    }

    /**
     * Cancela el escrow antes de que sea aceptado
     *
     * Requisitos:
     * - Solo lo puede ejecutar el owner.
     * - Debe estar en estado PendingAcceptance.
     * - Solo se puede realizar antes de acceptanceDeadline.
     *
     * Efectos:
     * - Acredita el amount completo al owner.
     * - Transiciona de PendingAcceptance a EscrowCancelled.
     * - Emite el evento EscrowCancelled.
     */
    function cancelEscrow()
        external
        onlyOwner
        inState(State.PendingAcceptance)
        notExpired(acceptanceDeadline)
    {
        pendingWithdrawals[owner] = amount;
        state = State.EscrowCancelled;
        emit EscrowCancelled();
    }

    /**
     * Envía el trabajo.
     *
     * Requisitos:
     * - Solo lo puede ejecutar el worker.
     * - Debe estar en estado PendingSubmission.
     * - Solo se puede ejecutar antes de submissionDeadline.
     * - La submissionReference debe ocupar entre 1 y MAX_SUBMISSION_REFERENCE_LENGTH bytes
     *
     * Efectos:
     * - Transiciona de PendingSubmission a PendingReview.
     * - Emite el evento WorkSubmitted.
     * - Calcula reviewDeadline.
     */
    function submitWork(
        string calldata submissionReference_
    )
        external
        onlyWorker
        inState(State.PendingSubmission)
        notExpired(submissionDeadline)
        textLengthOk(submissionReference_, MAX_SUBMISSION_REFERENCE_LENGTH)
    {
        state = State.PendingReview;
        reviewDeadline = block.timestamp + reviewDuration * 1 seconds;
        submissionReference = submissionReference_;
        emit WorkSubmitted(reviewDeadline);
    }

    /**
     * Materializa la expiración del período de envío.
     *
     * Requisitos:
     * - Puede ser ejecutado por cualquier cuenta.
     * - Debe estar en estado PendingSubmission.
     * - Solo se puede ejecutar después de submissionDeadline.
     *
     * Efectos:
     * - Acredita el amount completo al owner.
     * - Transiciona de PendingSubmission a SubmissionExpired.
     * - Emite el evento SubmissionExpired.
     */
    function expireSubmission()
        external
        inState(State.PendingSubmission)
        expired(submissionDeadline)
    {
        pendingWithdrawals[owner] = amount;
        state = State.SubmissionExpired;
        emit SubmissionExpired();
    }

    /**
     * Aprueba el trabajo.
     *
     * Requisitos:
     * - Solo lo puede ejecutar el owner.
     * - Debe estar en estado PendingReview.
     * - Solo se puede ejecutar antes de reviewDeadline.
     *
     * Efectos:
     * - Acredita el amount completo al worker.
     * - Transiciona de PendingReview a WorkApproved.
     * - Emite el evento WorkApproved.
     */
    function approveWork()
        external
        onlyOwner
        inState(State.PendingReview)
        notExpired(reviewDeadline)
    {
        pendingWithdrawals[worker] = amount;
        state = State.WorkApproved;
        emit WorkApproved();
    }

    function acceptanceExpired() external view returns (bool expired_) {
        return isExpired(acceptanceDeadline);
    }

    function submissionExpired() external view returns (bool expired_) {
        return isExpired(submissionDeadline);
    }

    function reviewExpired() external view returns (bool expired_) {
        return isExpired(reviewDeadline);
    }

    function arbitrationExpired() external view returns (bool expired_) {
        return isExpired(arbitrationDeadline);
    }

    // Internal
    function isExpired(uint256 deadline) internal view returns (bool expired_) {
        return deadline > 0 && block.timestamp >= deadline;
    }
}
