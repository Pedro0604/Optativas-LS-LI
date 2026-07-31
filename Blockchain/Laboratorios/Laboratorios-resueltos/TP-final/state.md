<!-- ## Estados

enum State {
// Estados no finales
PendingAcceptance,
PendingSubmission,
PendingReview,
PendingArbitration,

    // Estados finales
    EscrowCancelled,
    AcceptanceExpired,
    SubmissionExpired,
    WorkApproved,
    ReviewExpired,
    DisputeResolved,
    ArbitrationExpired

} -->

---

## Transiciones de estado

<!-- PendingAcceptance
├── acceptEscrow()
│ ├── solo worker
│ ├── antes de acceptanceDeadline
│ ├── calcula submissionDeadline
│ ├── emite EscrowAccepted(submissionDeadline)
│ └── pasa a PendingSubmission
│
├── cancelEscrow()
│ ├── solo owner
│ ├── antes de acceptanceDeadline
│ ├── acredita 100 % al owner
│ ├── emite EscrowCancelled()
│ └── pasa a EscrowCancelled
│
└── expireAcceptance()
├── cualquier cuenta
├── desde acceptanceDeadline
├── acredita 100 % al owner
├── emite AcceptanceExpired()
└── pasa a AcceptanceExpired
PendingSubmission
├── submitWork(submissionReference)
│ ├── solo worker
│ ├── antes de submissionDeadline
│ ├── referencia de 1 a 256 bytes
│ ├── almacena la referencia permanentemente
│ ├── calcula reviewDeadline
│ ├── emite WorkSubmitted(reviewDeadline)
│ └── pasa a PendingReview
│
└── expireSubmission()
├── cualquier cuenta
├── desde submissionDeadline
├── acredita 100 % al owner
├── emite SubmissionExpired()
└── pasa a SubmissionExpired -->
PendingReview
├── approveWork()
│ ├── solo owner
│ ├── antes de reviewDeadline
│ ├── acredita 100 % al worker
│ ├── emite WorkApproved()
│ └── pasa a WorkApproved
│
├── openDispute(disputeReason)
│ ├── solo owner
│ ├── antes de reviewDeadline
│ ├── motivo de 1 a 256 bytes
│ ├── almacena el motivo permanentemente
│ ├── calcula arbitrationDeadline
│ ├── emite DisputeOpened(arbitrationDeadline)
│ └── pasa a PendingArbitration
│
└── expireReview()
├── cualquier cuenta
├── desde reviewDeadline
├── acredita 100 % al worker
├── emite ReviewExpired()
└── pasa a ReviewExpired
PendingArbitration
├── resolveDispute(workerAmount, resolutionReason)
│ ├── solo arbiter
│ ├── antes de arbitrationDeadline
│ ├── workerAmount entre 0 y amount
│ ├── calcula ownerAmount = amount - workerAmount
│ ├── almacena una justificación de 1 a 256 bytes
│ ├── acredita ambos saldos
│ ├── emite DisputeResolved(ownerAmount, workerAmount)
│ └── pasa a DisputeResolved
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

<!-- ## Eventos

event EscrowAccepted(uint256 submissionDeadline);
event EscrowCancelled();

event AcceptanceExpired();

event WorkSubmitted(uint256 reviewDeadline);
event SubmissionExpired();

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

<!-- function acceptEscrow() external;

function cancelEscrow() external;

function expireAcceptance() external;

function submitWork(
string calldata submissionReference_
) external;

function expireSubmission() external; -->

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
- expireSubmission();
- expireReview();
- expireArbitration();

Las duraciones:

- Se expresan en segundos;
- Deben ser mayores que cero;
- No tienen un máximo contractual.

---

## Distribución de fondos en estados finales

EscrowCancelled → 100 % owner
AcceptanceExpired → 100 % owner
SubmissionExpired → 100 % owner
WorkApproved → 100 % worker
ReviewExpired → 100 % worker
DisputeResolved → distribución elegida por arbiter
ArbitrationExpired → 50/50, wei sobrante para worker

--

<!-- ## Text lengths

uint256 public constant MAX_TITLE_LENGTH = 64;
uint256 public constant MAX_SUBMISSION_REFERENCE_LENGTH = 256;
uint256 public constant MAX_DISPUTE_REASON_LENGTH = 256;
uint256 public constant MAX_RESOLUTION_REASON_LENGTH = 256;

Mínimo 1 -->

---

## createEscrow

<!-- function createEscrow(
address worker_,
address arbitrator_,
uint256 acceptanceDuration_,
uint256 submissionDuration_,
uint256 reviewDuration_,
uint256 arbitrationDuration_,
string calldata title_
) external payable returns (address escrowAddress);

---

## EscrowCreated

event EscrowCreated(
    address indexed owner,
    address indexed worker,
    address indexed arbiter,
    address escrowAddress,
    uint256 amount,
    uint256 acceptanceDeadline,
    uint256 submissionDuration,
    uint256 reviewDuration,
    uint256 arbitrationDuration
); -->

---

## Factory añade

<!-- mapping(address arbiter => address[] escrows)
public escrowsByArbitrator; -->

## Transiciones válidas

<!-- - `PendingAcceptance` to `PendingSubmission` through `acceptEscrow()`.
- `PendingAcceptance` to `EscrowCancelled` through `cancelEscrow()`.
- `PendingAcceptance` to `AcceptanceExpired` through `expireAcceptance()`.
- `PendingSubmission` to `PendingReview` through `submitWork()`.
- `PendingSubmission` to `SubmissionExpired` through `expireSubmission()`. -->
- `PendingReview` to `WorkApproved` through `approveWork()`.
- `PendingReview` to `PendingArbitration` through `openDispute()`.
- `PendingReview` to `ReviewExpired` through `expireReview()`.
- `PendingArbitration` to `DisputeResolved` through `resolveDispute()`.
- `PendingArbitration` to `ArbitrationExpired` through `expireArbitration()`.
