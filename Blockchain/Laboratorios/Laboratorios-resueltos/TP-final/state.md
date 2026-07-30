## Estados
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

---

## Transiciones de estado
PendingAcceptance
├── accept()
│   ├── solo worker
│   ├── antes de acceptanceDeadline
│   ├── calcula deliveryDeadline
│   ├── emite Accepted(deliveryDeadline)
│   └── pasa a Active
│
├── cancel()
│   ├── solo owner
│   ├── antes de acceptanceDeadline
│   ├── acredita 100 % al owner
│   ├── emite Cancelled()
│   └── pasa a Cancelled
│
└── expireAcceptance()
    ├── cualquier cuenta
    ├── desde acceptanceDeadline
    ├── acredita 100 % al owner
    ├── emite AcceptanceExpired()
    └── pasa a AcceptanceExpired
Active
├── submitWork(deliveryReference)
│   ├── solo worker
│   ├── antes de deliveryDeadline
│   ├── referencia de 1 a 256 bytes
│   ├── almacena la referencia permanentemente
│   ├── calcula reviewDeadline
│   ├── emite WorkSubmitted(reviewDeadline)
│   └── pasa a PendingReview
│
└── expireDelivery()
    ├── cualquier cuenta
    ├── desde deliveryDeadline
    ├── acredita 100 % al owner
    ├── emite DeliveryExpired()
    └── pasa a DeliveryExpired
PendingReview
├── approveWork()
│   ├── solo owner
│   ├── antes de reviewDeadline
│   ├── acredita 100 % al worker
│   ├── emite WorkApproved()
│   └── pasa a Approved
│
├── openDispute(disputeReason)
│   ├── solo owner
│   ├── antes de reviewDeadline
│   ├── motivo de 1 a 256 bytes
│   ├── almacena el motivo permanentemente
│   ├── calcula arbitrationDeadline
│   ├── emite DisputeOpened(arbitrationDeadline)
│   └── pasa a Disputed
│
└── expireReview()
    ├── cualquier cuenta
    ├── desde reviewDeadline
    ├── acredita 100 % al worker
    ├── emite ReviewExpired()
    └── pasa a ReviewExpired
Disputed
├── resolveDispute(workerAmount, resolutionReason)
│   ├── solo arbitrator
│   ├── antes de arbitrationDeadline
│   ├── workerAmount entre 0 y amount
│   ├── calcula ownerAmount = amount - workerAmount
│   ├── almacena una justificación de 1 a 256 bytes
│   ├── acredita ambos saldos
│   ├── emite DisputeResolved(ownerAmount, workerAmount)
│   └── pasa a Resolved
│
└── expireArbitration()
    ├── cualquier cuenta
    ├── desde arbitrationDeadline
    ├── divide 50/50
    ├── asigna el wei sobrante al worker
    ├── emite ArbitrationExpired()
    └── pasa a ArbitrationExpired

---

## withdraw
withdraw()
├── retira todo pendingWithdrawals[msg.sender]
├── revierte si el saldo es cero
├── pone el saldo en cero antes de transferir
├── emite FundsWithdrawn(account, amount)
└── no modifica state

---

## Eventos
event Accepted(uint256 deliveryDeadline);
event Cancelled();

event AcceptanceExpired();

event WorkSubmitted(uint256 reviewDeadline);
event DeliveryExpired();

event WorkApproved();
event ReviewExpired();

event DisputeOpened(uint256 arbitrationDeadline);

event DisputeResolved(
    uint256 ownerAmount,
    uint256 workerAmount
);

event ArbitrationExpired();

event FundsWithdrawn(
    address indexed account,
    uint256 amount
);

---

## Firmas de funciones
function accept() external;

function cancel() external;

function expireAcceptance() external;

function submitWork(
    string calldata deliveryReference_
) external;

function expireDelivery() external;

function approveWork() external;

function openDispute(
    string calldata disputeReason_
) external;

function expireReview() external;

function resolveDispute(
    uint256 workerAmount,
    string calldata resolutionReason_
) external;

function expireArbitration() external;

function withdraw() external;

---

## Deadlines y duraciones
Antes del deadline: block.timestamp < deadline
Desde el deadline: block.timestamp >= deadline

Las expiraciones solo ocurren mediante:
- expireAcceptance();
- expireDelivery();
- expireReview();
- expireArbitration();

Las duraciones:
- Se expresan en segundos;
- Deben ser mayores que cero;
- No tienen un máximo contractual.

---

## Distribución de fondos en estados finales
Cancelled           → 100 % owner
AcceptanceExpired   → 100 % owner
DeliveryExpired     → 100 % owner
Approved            → 100 % worker
ReviewExpired       → 100 % worker
Resolved            → distribución elegida por arbitrator
ArbitrationExpired  → 50/50, wei sobrante para worker

--

## Text lengths
uint256 public constant MAX_TITLE_LENGTH = 64;
uint256 public constant MAX_DELIVERY_REFERENCE_LENGTH = 256;
uint256 public constant MAX_DISPUTE_REASON_LENGTH = 256;
uint256 public constant MAX_RESOLUTION_REASON_LENGTH = 256;

Mínimo 1

---

## createEscrow
function createEscrow(
    address worker_,
    address arbitrator_,
    uint256 acceptanceDuration_,
    uint256 workDuration_,
    uint256 reviewDuration_,
    uint256 arbitrationDuration_,
    string calldata title_
) external payable returns (address escrowAddress);

---

## EscrowCreated
event EscrowCreated(
    address indexed owner,
    address indexed worker,
    address indexed arbitrator,
    address escrowAddress,
    uint256 amount,
    uint256 acceptanceDeadline,
    uint256 workDuration,
    uint256 reviewDuration,
    uint256 arbitrationDuration
);

---

## Factory añade
mapping(address arbitrator => address[] escrows)
    public escrowsByArbitrator;

y este?:
mapping(address escrow => bool registered)
    public isEscrow;