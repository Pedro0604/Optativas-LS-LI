import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import type { Address } from "viem";
import { escrowAbi } from "@escrow/contracts";
import { useAccount, useWriteContract } from "wagmi";
import * as Slider from "radix-ui/slider";
import * as ToggleGroup from "radix-ui/toggle-group";
import { config, publicClient } from "../runtime";
import { Badge } from "../ui/Badge";
import { Button, actionClassName } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { AddressDisplay } from "../ui/AddressDisplay";
import { PrivacyWarning } from "../ui/PrivacyWarning";
import { displayEth } from "./discovery";
import {
  actionAvailability,
  escrowDetailQuery,
  lifecycleWriteDetail,
  isLifecycleWriteAction,
  projectEscrow,
  safeSubmissionUrl,
  type LifecycleWriteAction,
} from "./detail";
import { formatDeadlineDate, formatDeadlineDistance, formatDuration, useChainTime } from "./time";
import { canAcceptEscrow } from "./acceptance";
import { canApproveWork, canOpenDispute, canSubmitWork, validatePublicText } from "./reviewActions";
import {
  isEscrowTransactionPending,
  hasTrackedTransaction,
  isTransactionPending,
  runEscrowTransaction,
  type TransactionState,
} from "../transactions/coordinator";
import {
  allocationFromWorkerSlider,
  allocationSliderSteps,
  canResolveDispute,
  complementAllocationPercent,
  formatAllocationEth,
  formatAllocationPercent,
  parseAllocationPercent,
  parseOwnerAllocation,
  parseWorkerAllocation,
} from "./resolution";
import { WalletControls } from "../wallet/WalletControls";
import { canWithdrawFromEscrow, formatPendingWithdrawal, pendingWithdrawalFor } from "./withdrawal";
import { EscrowParticipants } from "./EscrowParticipants";
import { escrowActionLabels, escrowSigningLabels, signingLabelForAction } from "./domainLabels";
import { EscrowDetailSummary } from "./EscrowDetailSummary";
import { EscrowStateHeader } from "./EscrowStateHeader";

function Evidence({
  label,
  value,
  link = false,
}: {
  label: string;
  value: string;
  link?: boolean;
}) {
  if (!value) return null;
  const url = link ? safeSubmissionUrl(value) : undefined;
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 break-words">
        {url ? (
          <a
            className="text-primary underline"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function TransactionFeedback({ transaction }: { transaction: TransactionState }) {
  if (
    transaction.kind === "idle" ||
    transaction.kind === "simulating" ||
    transaction.kind === "wallet"
  )
    return null;
  if (
    transaction.kind === "submitted" ||
    transaction.kind === "confirmed" ||
    transaction.kind === "prolonged" ||
    transaction.kind === "replaced"
  )
    return (
      <p role="status" className="break-all text-sm">
        {transaction.kind === "confirmed" ? "Transacción confirmada: " : "Transacción enviada: "}
        <a
          className="text-primary underline"
          href={`${config.explorerUrl}/tx/${transaction.hash}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {transaction.hash}
        </a>
      </p>
    );
  return (
    <div role="alert" className="grid gap-2 text-danger">
      <p>{transaction.message}</p>
      <details className="overflow-auto text-xs text-muted">
        <summary>Detalle técnico</summary>
        <pre className="mt-2 whitespace-pre-wrap">{transaction.detail}</pre>
      </details>
    </div>
  );
}

type ResolutionField = "workerAmount" | "workerPercent" | "ownerAmount" | "ownerPercent" | "reason";

export function EscrowDetailPage() {
  const { address } = useParams({ from: "/escrows/$address" });
  const { address: account, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const [submissionReference, setSubmissionReference] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [reviewingResolution, setReviewingResolution] = useState(false);
  const resolutionPanelRef = useRef<HTMLDivElement>(null);
  const [workerAmountWei, setWorkerAmountWei] = useState(0n);
  const [workerAmountInput, setWorkerAmountInput] = useState("0");
  const [ownerAmountInput, setOwnerAmountInput] = useState("0");
  const [workerPercentInput, setWorkerPercentInput] = useState("50");
  const [ownerPercentInput, setOwnerPercentInput] = useState("50");
  const [blurredResolutionFields, setBlurredResolutionFields] = useState<
    Partial<Record<ResolutionField, true>>
  >({});
  const [resolutionReason, setResolutionReason] = useState("");
  const [transaction, setTransaction] = useState<TransactionState>({ kind: "idle" });
  const [withdrawalTransaction, setWithdrawalTransaction] = useState<TransactionState>({
    kind: "idle",
  });
  const query = useQuery(
    escrowDetailQuery(publicClient, config.factoryAddress, address as Address),
  );
  const successfulResult = query.data && "snapshot" in query.data ? query.data : undefined;
  const initialProjection = successfulResult
    ? projectEscrow(successfulResult.snapshot, successfulResult.blockTime, { account, chainId })
    : undefined;
  const refreshDeadline = useCallback(() => void query.refetch(), [query.refetch]);
  const now = useChainTime(
    successfulResult?.blockTime ?? 0n,
    initialProjection?.activeDeadline,
    refreshDeadline,
  );

  useEffect(() => {
    setWithdrawalTransaction({ kind: "idle" });
  }, [account, chainId]);

  useEffect(() => {
    if (!reviewingResolution) return;
    const frame = window.requestAnimationFrame(() => {
      resolutionPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [reviewingResolution]);

  if (query.isPending) return <Panel role="status">Cargando detalle…</Panel>;
  if (query.isError)
    return (
      <Panel role="alert">
        <h1 className="font-display text-3xl font-bold">No pudimos leer el escrow</h1>
        <p className="text-muted">La consulta a Sepolia falló. Podés volver a intentarlo.</p>
        <Button onClick={() => query.refetch()}>Reintentar</Button>
      </Panel>
    );

  if (query.data.kind === "not-found")
    return (
      <Panel role="alert">
        <h1 className="font-display text-3xl font-bold">Escrow no encontrado</h1>
        <p className="text-muted">
          La dirección es válida, pero no pertenece al factory configurado.
        </p>
        <Link to="/" className={actionClassName}>
          Volver al registro
        </Link>
      </Panel>
    );

  const { snapshot } = query.data;
  const projection = projectEscrow(snapshot, now, { account, chainId });
  const availability = actionAvailability(projection, { account, chainId });
  const acceptance = canAcceptEscrow(snapshot, account, now, chainId);
  const submission = canSubmitWork(snapshot, account, now, chainId);
  const approval = canApproveWork(snapshot, account, now, chainId);
  const dispute = canOpenDispute(snapshot, account, now, chainId);
  const resolution = canResolveDispute(snapshot, account, now, chainId);
  const allocation = formatAllocationEth(workerAmountWei, snapshot.amount);
  const workerAmountValidation = parseWorkerAllocation(workerAmountInput, snapshot.amount);
  const ownerAmountValidation = parseOwnerAllocation(ownerAmountInput, snapshot.amount);
  const workerPercentValidation = parseAllocationPercent(
    workerPercentInput,
    "worker",
    snapshot.amount,
  );
  const ownerPercentValidation = parseAllocationPercent(
    ownerPercentInput,
    "owner",
    snapshot.amount,
  );
  const allocationInputError = [
    workerAmountValidation,
    ownerAmountValidation,
    workerPercentValidation,
    ownerPercentValidation,
  ].find((validation) => !validation.ok);
  const resolutionReasonValidation = validatePublicText(resolutionReason, 256);
  const workerSliderValue = snapshot.amount
    ? Number((workerAmountWei * allocationSliderSteps) / snapshot.amount)
    : 0;
  const activeAllocationPreset = workerPercentValidation.ok
    ? ["0", "50", "100"].find(
        (preset) => Number(workerPercentInput.replace(",", ".")) === Number(preset),
      )
    : undefined;
  const pendingWithdrawal = pendingWithdrawalFor(snapshot, account);

  async function refreshAfterConfirmation() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["escrow", snapshot.address] }),
      queryClient.invalidateQueries({ queryKey: ["escrows"] }),
      queryClient.invalidateQueries({ queryKey: ["my-escrows"] }),
    ]);
  }

  async function accept() {
    if (!account || !acceptance.ok) return;
    const result = await runEscrowTransaction(snapshot.address, {
      simulate: () =>
        publicClient.simulateContract({
          account,
          address: snapshot.address,
          abi: escrowAbi,
          functionName: "acceptEscrow",
        }),
      write: writeContractAsync,
      wait: (hash) => publicClient.waitForTransactionReceipt({ hash }),
      onState: setTransaction,
    });
    if (result.kind === "confirmed") {
      await refreshAfterConfirmation();
    }
  }

  async function runLifecycleAction(action: LifecycleWriteAction) {
    if (!account || !projection.availableActions.includes(action)) return;
    const result = await runEscrowTransaction(snapshot.address, {
      simulate: () =>
        publicClient.simulateContract({
          account,
          address: snapshot.address,
          abi: escrowAbi,
          functionName: lifecycleWriteDetail(action).functionName,
        }),
      write: writeContractAsync,
      wait: (hash) => publicClient.waitForTransactionReceipt({ hash }),
      onState: setTransaction,
    });
    if (result.kind === "confirmed") {
      await refreshAfterConfirmation();
    }
  }

  async function runReviewAction(action: "submit" | "approve" | "dispute") {
    if (!account) return;
    const input = action === "submit" ? submissionReference : disputeReason;
    if ((action === "submit" || action === "dispute") && validatePublicText(input, 256)) return;
    const eligibility =
      action === "submit" ? submission : action === "approve" ? approval : dispute;
    if (!eligibility.ok) return;
    const shared = {
      write: writeContractAsync,
      wait: (hash: `0x${string}`) => publicClient.waitForTransactionReceipt({ hash }),
      onState: setTransaction,
    };
    const result =
      action === "submit"
        ? await runEscrowTransaction(snapshot.address, {
            ...shared,
            simulate: () =>
              publicClient.simulateContract({
                account,
                address: snapshot.address,
                abi: escrowAbi,
                functionName: "submitWork",
                args: [input],
              }),
          })
        : action === "approve"
          ? await runEscrowTransaction(snapshot.address, {
              ...shared,
              simulate: () =>
                publicClient.simulateContract({
                  account,
                  address: snapshot.address,
                  abi: escrowAbi,
                  functionName: "approveWork",
                }),
            })
          : await runEscrowTransaction(snapshot.address, {
              ...shared,
              simulate: () =>
                publicClient.simulateContract({
                  account,
                  address: snapshot.address,
                  abi: escrowAbi,
                  functionName: "openDispute",
                  args: [input],
                }),
            });
    if (result.kind === "confirmed") {
      await refreshAfterConfirmation();
    }
  }

  function setWorkerAllocation(value: bigint) {
    setWorkerAmountWei(value);
    const amounts = formatAllocationEth(value, snapshot.amount);
    const percentages = formatAllocationPercent(value, snapshot.amount);
    setWorkerAmountInput(amounts.worker);
    setOwnerAmountInput(amounts.owner);
    setWorkerPercentInput(percentages.worker);
    setOwnerPercentInput(percentages.owner);
  }

  function setEthAllocation(value: string, party: "worker" | "owner") {
    if (party === "worker") setWorkerAmountInput(value);
    else setOwnerAmountInput(value);
    const parsed =
      party === "worker"
        ? parseWorkerAllocation(value, snapshot.amount)
        : parseOwnerAllocation(value, snapshot.amount);
    if (parsed.ok) setWorkerAllocation(parsed.workerAmountWei);
  }

  function setPercentAllocation(value: string, party: "worker" | "owner") {
    if (party === "worker") setWorkerPercentInput(value);
    else setOwnerPercentInput(value);
    const parsed = parseAllocationPercent(value, party, snapshot.amount);
    const complement = complementAllocationPercent(value);
    if (!parsed.ok || complement === undefined) return;

    setWorkerAmountWei(parsed.workerAmountWei);
    const amounts = formatAllocationEth(parsed.workerAmountWei, snapshot.amount);
    setWorkerAmountInput(amounts.worker);
    setOwnerAmountInput(amounts.owner);
    const normalized = value.trim().replace(",", ".");
    if (party === "worker") {
      setWorkerPercentInput(normalized);
      setOwnerPercentInput(complement);
    } else {
      setOwnerPercentInput(normalized);
      setWorkerPercentInput(complement);
    }
  }

  function markResolutionFieldBlurred(field: ResolutionField) {
    setBlurredResolutionFields((current) => ({ ...current, [field]: true }));
  }

  function reviewAndResolveDispute() {
    if (allocationInputError || resolutionReasonValidation) {
      setBlurredResolutionFields({
        workerAmount: true,
        workerPercent: true,
        ownerAmount: true,
        ownerPercent: true,
        reason: true,
      });
      return;
    }
    void resolveDispute();
  }

  async function resolveDispute() {
    if (!account || !resolution.ok || allocationInputError || resolutionReasonValidation) return;
    const result = await runEscrowTransaction(snapshot.address, {
      simulate: () =>
        publicClient.simulateContract({
          account,
          address: snapshot.address,
          abi: escrowAbi,
          functionName: "resolveDispute",
          args: [workerAmountWei, resolutionReason],
        }),
      write: writeContractAsync,
      wait: (hash) => publicClient.waitForTransactionReceipt({ hash }),
      onState: setTransaction,
    });
    if (result.kind === "confirmed") {
      await refreshAfterConfirmation();
      setReviewingResolution(false);
    }
  }

  async function withdraw() {
    if (!account || pendingWithdrawal <= 0n) return;
    const result = await runEscrowTransaction(snapshot.address, {
      simulate: () =>
        publicClient.simulateContract({
          account,
          address: snapshot.address,
          abi: escrowAbi,
          functionName: "withdraw",
        }),
      write: writeContractAsync,
      wait: (hash) => publicClient.waitForTransactionReceipt({ hash }),
      onState: setWithdrawalTransaction,
    });
    if (result.kind === "confirmed") {
      await refreshAfterConfirmation();
    }
  }

  const visitorExpirationAction = projection.deadlineElapsed
    ? (projectEscrow(snapshot, now).availableActions[0] as LifecycleWriteAction | undefined)
    : undefined;
  const lifecycleActions = projection.availableActions.filter(isLifecycleWriteAction);
  if (visitorExpirationAction && !lifecycleActions.includes(visitorExpirationAction))
    lifecycleActions.push(visitorExpirationAction);

  const actionInteraction = (
    <div className="mt-4 grid gap-5">
      {canWithdrawFromEscrow(snapshot, account, chainId) && (
        <section className="grid gap-3 border-t border-primary/25 pt-4 first:border-0 first:pt-0">
          <h3 className="font-display text-xl font-bold">Retirar fondos</h3>
          <p className="text-sm text-muted">
            Retirá {formatPendingWithdrawal(pendingWithdrawal)} desde este escrow.
          </p>
          <Button
            disabled={
              isTransactionPending(withdrawalTransaction) ||
              isEscrowTransactionPending(snapshot.address)
            }
            onClick={withdraw}
          >
            {isTransactionPending(withdrawalTransaction)
              ? "Procesando…"
              : escrowSigningLabels.withdraw}
          </Button>
          <TransactionFeedback transaction={withdrawalTransaction} />
        </section>
      )}
      {projection.availableActions.includes(escrowActionLabels.accept) && (
        <section className="grid gap-3 border-t border-primary/25 pt-4 first:border-0 first:pt-0">
          <h3 className="font-display text-xl font-bold">Aceptar escrow</h3>
          <p className="text-sm text-muted">
            La aceptación inicia el plazo de entrega y no puede deshacerse.
          </p>
          {!acceptance.ok && <p className="text-sm text-danger">{acceptance.message}</p>}
          <Button
            disabled={
              !acceptance.ok ||
              isTransactionPending(transaction) ||
              isEscrowTransactionPending(snapshot.address)
            }
            onClick={accept}
          >
            {isTransactionPending(transaction) ? "Procesando…" : escrowSigningLabels.accept}
          </Button>
        </section>
      )}
      {(["submit", "approve", "dispute"] as const).map((action) => {
        const label =
          action === "submit"
            ? escrowActionLabels.submit
            : action === "approve"
              ? escrowActionLabels.approve
              : escrowActionLabels.dispute;
        if (!projection.availableActions.includes(label)) return null;
        const value = action === "submit" ? submissionReference : disputeReason;
        const validation = action === "approve" ? undefined : validatePublicText(value, 256);
        const eligibility =
          action === "submit" ? submission : action === "approve" ? approval : dispute;
        return (
          <section
            className="grid gap-3 border-t border-primary/25 pt-4 first:border-0 first:pt-0"
            key={action}
          >
            <h3 className="font-display text-xl font-bold">{label}</h3>
            <p className="text-sm text-muted">
              {action === "submit"
                ? "La referencia quedará pública e inmutable."
                : action === "approve"
                  ? "El monto completo quedará disponible para el worker."
                  : "El motivo quedará público y se abrirá el arbitraje."}
            </p>
            {action !== "approve" && (
              <>
                <textarea
                  aria-label={action === "submit" ? "Referencia de entrega" : "Motivo de disputa"}
                  className="min-h-24 rounded-lg border border-line bg-surface p-3"
                  maxLength={256}
                  value={action === "submit" ? submissionReference : disputeReason}
                  onChange={(event) =>
                    action === "submit"
                      ? setSubmissionReference(event.target.value)
                      : setDisputeReason(event.target.value)
                  }
                />
                <PrivacyWarning />
              </>
            )}
            {validation && (
              <p role="alert" className="text-sm text-danger">
                {validation}
              </p>
            )}
            {!eligibility.ok && <p className="text-sm text-danger">{eligibility.message}</p>}
            <Button
              disabled={
                !!validation ||
                !eligibility.ok ||
                isTransactionPending(transaction) ||
                isEscrowTransactionPending(snapshot.address)
              }
              onClick={() => runReviewAction(action)}
            >
              {isTransactionPending(transaction) ? "Procesando…" : escrowSigningLabels[action]}
            </Button>
          </section>
        );
      })}
      {projection.availableActions.includes(escrowActionLabels.resolve) && (
        <section className="grid gap-3 border-t border-primary/25 pt-4 first:border-0 first:pt-0">
          <h3 className="font-display text-xl font-bold">Resolver disputa</h3>
          <p className="text-sm text-muted">La distribución requiere un editor más amplio.</p>
          <Button
            onClick={() => {
              setPercentAllocation("50", "worker");
              setResolutionReason("");
              setBlurredResolutionFields({});
              setReviewingResolution(true);
            }}
          >
            Abrir resolución debajo
          </Button>
        </section>
      )}
      {lifecycleActions.map((action) => (
        <section
          className="grid gap-3 border-t border-primary/25 pt-4 first:border-0 first:pt-0"
          key={action}
        >
          <h3 className="font-display text-xl font-bold">{action}</h3>
          <p className="text-sm text-muted">{lifecycleWriteDetail(action).consequence}</p>
          {!account ? (
            <WalletControls />
          ) : projection.availableActions.includes(action) ? (
            <Button
              disabled={
                isTransactionPending(transaction) || isEscrowTransactionPending(snapshot.address)
              }
              onClick={() => runLifecycleAction(action)}
            >
              {isTransactionPending(transaction) ? "Procesando…" : signingLabelForAction(action)}
            </Button>
          ) : (
            <p className="text-sm text-danger">Esta cuenta no puede realizar esta acción.</p>
          )}
        </section>
      ))}
      {(availability.kind === "wallet-required" || availability.kind === "wrong-network") &&
        lifecycleActions.length === 0 && <WalletControls />}
      <TransactionFeedback transaction={transaction} />
    </div>
  );

  return (
    <div className="grid gap-6">
      <EscrowStateHeader
        title={snapshot.title}
        address={snapshot.address}
        state={projection.stateLabel}
        deadlineElapsed={projection.deadlineElapsed}
      />
      <EscrowDetailSummary
        amount={displayEth(snapshot.amount)}
        guidance={
          availability.kind === "available"
            ? availability.actions.length === 1
              ? `Podés ${availability.actions[0].toLocaleLowerCase()}.`
              : "Este escrow requiere tu intervención. Elegí una opción debajo."
            : availability.kind === "wallet-required"
              ? "Conectá tu wallet para saber si este escrow requiere tu intervención."
              : availability.kind === "wrong-network"
                ? "Cambiá tu wallet a Sepolia para operar este escrow."
                : availability.kind === "terminal"
                  ? "El ciclo de vida del escrow finalizó."
                  : "No necesitás hacer nada en esta etapa."
        }
        pendingBalance={account ? formatPendingWithdrawal(pendingWithdrawal) : undefined}
        interaction={actionInteraction}
        participants={
          <>
            <EscrowParticipants
              account={account}
              owner={snapshot.owner}
              worker={snapshot.worker}
              arbiter={snapshot.arbiter}
            />
          </>
        }
      />
      {projection.availableActions.includes(escrowActionLabels.resolve) && reviewingResolution && (
        <div ref={resolutionPanelRef}>
          <Panel as="section" className="grid gap-4">
            <div>
              <p className="text-xs font-bold tracking-widest text-accent uppercase">
                Decisión arbitral
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold">Resolver disputa</h2>
              <p className="text-muted">
                Asigná el monto exacto al worker; el owner recibe siempre el remanente exacto.
              </p>
            </div>
            <section className="rounded-xl border border-accent/35 bg-accent/5 p-4">
              <h3 className="mb-4 font-display text-lg font-bold">Evidencia para decidir</h3>
              <dl className="grid gap-5">
                <Evidence
                  label="Referencia del trabajo"
                  value={snapshot.submissionReference}
                  link
                />
                <Evidence label="Motivo de la disputa" value={snapshot.disputeReason} />
              </dl>
            </section>
            {!reviewingResolution ? (
              <Button
                onClick={() => {
                  setPercentAllocation("50", "worker");
                  setResolutionReason("");
                  setBlurredResolutionFields({});
                  setReviewingResolution(true);
                }}
              >
                Revisar resolución
              </Button>
            ) : (
              <div className="grid gap-6 rounded-2xl border border-line bg-surface-raised/40 p-4 sm:p-6">
                <div className="grid items-stretch gap-4 md:grid-cols-2">
                  <section className="grid content-start gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 transition-colors">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                        Worker
                      </p>
                      <p className="text-sm text-muted">Recibe por el trabajo realizado</p>
                    </div>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium">Porcentaje</span>
                      <span
                        className={`flex w-36 items-baseline rounded-xl border bg-surface px-3 py-2 transition-colors focus-within:border-primary ${!workerPercentValidation.ok ? "border-danger/70" : "border-line"}`}
                      >
                        <input
                          aria-label="Porcentaje del worker"
                          className="min-w-0 flex-1 bg-transparent text-right font-display text-3xl font-bold outline-none"
                          inputMode="decimal"
                          value={workerPercentInput}
                          onBlur={() => markResolutionFieldBlurred("workerPercent")}
                          onChange={(event) => setPercentAllocation(event.target.value, "worker")}
                        />
                        <span className="ml-1 text-lg font-semibold text-muted">%</span>
                      </span>
                      <span className="overflow-hidden text-sm">
                        {blurredResolutionFields.workerPercent && !workerPercentValidation.ok && (
                          <span role="alert" className="text-danger">
                            {workerPercentValidation.message}
                          </span>
                        )}
                      </span>
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium">Monto exacto</span>
                      <span className="flex items-center rounded-xl border border-line bg-surface px-3 transition-colors focus-within:border-primary">
                        <input
                          aria-label="Monto del worker en ETH"
                          className="min-w-0 flex-1 bg-transparent py-3 outline-none"
                          inputMode="decimal"
                          value={workerAmountInput}
                          onBlur={() => markResolutionFieldBlurred("workerAmount")}
                          onChange={(event) => setEthAllocation(event.target.value, "worker")}
                        />
                        <span className="ml-2 text-sm font-semibold text-muted">ETH</span>
                      </span>
                      <span className="h-10 overflow-hidden text-sm">
                        {blurredResolutionFields.workerAmount && !workerAmountValidation.ok ? (
                          <span role="alert" className="text-danger">
                            {workerAmountValidation.message}
                          </span>
                        ) : (
                          <span className="text-muted">{workerAmountWei.toString()} wei</span>
                        )}
                      </span>
                    </label>
                  </section>

                  <section className="grid content-start gap-4 rounded-2xl border border-accent/30 bg-accent/5 p-4 transition-colors">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                        Owner
                      </p>
                      <p className="text-sm text-muted">Recupera el remanente del escrow</p>
                    </div>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium">Porcentaje</span>
                      <span
                        className={`flex w-36 items-baseline rounded-xl border bg-surface px-3 py-2 transition-colors focus-within:border-accent ${!ownerPercentValidation.ok ? "border-danger/70" : "border-line"}`}
                      >
                        <input
                          aria-label="Porcentaje del owner"
                          className="min-w-0 flex-1 bg-transparent text-right font-display text-3xl font-bold outline-none"
                          inputMode="decimal"
                          value={ownerPercentInput}
                          onBlur={() => markResolutionFieldBlurred("ownerPercent")}
                          onChange={(event) => setPercentAllocation(event.target.value, "owner")}
                        />
                        <span className="ml-1 text-lg font-semibold text-muted">%</span>
                      </span>
                      <span className="overflow-hidden text-sm">
                        {blurredResolutionFields.ownerPercent && !ownerPercentValidation.ok && (
                          <span role="alert" className="text-danger">
                            {ownerPercentValidation.message}
                          </span>
                        )}
                      </span>
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium">Monto exacto</span>
                      <span className="flex items-center rounded-xl border border-line bg-surface px-3 transition-colors focus-within:border-accent">
                        <input
                          aria-label="Monto del owner en ETH"
                          className="min-w-0 flex-1 bg-transparent py-3 outline-none"
                          inputMode="decimal"
                          value={ownerAmountInput}
                          onBlur={() => markResolutionFieldBlurred("ownerAmount")}
                          onChange={(event) => setEthAllocation(event.target.value, "owner")}
                        />
                        <span className="ml-2 text-sm font-semibold text-muted">ETH</span>
                      </span>
                      <span className="h-10 overflow-hidden text-sm">
                        {blurredResolutionFields.ownerAmount && !ownerAmountValidation.ok ? (
                          <span role="alert" className="text-danger">
                            {ownerAmountValidation.message}
                          </span>
                        ) : (
                          <span className="text-muted">
                            {(snapshot.amount - workerAmountWei).toString()} wei
                          </span>
                        )}
                      </span>
                    </label>
                  </section>
                </div>

                <div className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-center justify-between gap-4 text-sm font-semibold">
                    <span className="text-primary">Worker · {workerPercentInput}%</span>
                    <span className="text-accent">Owner · {ownerPercentInput}%</span>
                  </div>
                  <Slider.Root
                    aria-label="Reparto entre worker y owner"
                    className="relative flex h-5 touch-none select-none items-center"
                    min={0}
                    max={Number(allocationSliderSteps)}
                    step={1}
                    value={[workerSliderValue]}
                    onValueChange={([value]) =>
                      setWorkerAllocation(allocationFromWorkerSlider(value, snapshot.amount))
                    }
                  >
                    <Slider.Track className="relative h-2 grow overflow-hidden rounded-full bg-accent/25">
                      <Slider.Range className="absolute h-full bg-primary" />
                    </Slider.Track>
                    <Slider.Thumb className="block z-10 block size-5 rounded-full border-2 border-primary bg-surface shadow-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-accent/40" />
                  </Slider.Root>
                  <div>
                    <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-muted">
                      Worker / Owner
                    </p>
                    <ToggleGroup.Root
                      type="single"
                      aria-label="Repartos rápidos"
                      className="grid grid-cols-3 overflow-hidden rounded-xl border border-line bg-surface-raised p-1"
                      value={activeAllocationPreset ?? ""}
                      onValueChange={(value) => value && setPercentAllocation(value, "worker")}
                    >
                      {[
                        ["0", "0 / 100"],
                        ["50", "50 / 50"],
                        ["100", "100 / 0"],
                      ].map(([workerPercent, label]) => (
                        <ToggleGroup.Item
                          key={workerPercent}
                          value={workerPercent}
                          aria-label={`Reparto ${label}`}
                          className="cursor-pointer rounded-lg border border-transparent px-2 py-2 text-sm font-semibold text-muted transition-colors hover:text-primary-strong focus-visible:outline-3 focus-visible:outline-accent data-[state=on]:border-primary/50 data-[state=on]:bg-primary/15 data-[state=on]:text-primary-strong"
                        >
                          {label}
                        </ToggleGroup.Item>
                      ))}
                    </ToggleGroup.Root>
                  </div>
                </div>
                <label className="grid gap-2">
                  <span className="font-semibold">Motivo de resolución</span>
                  <textarea
                    className={`min-h-28 resize-y rounded-xl border bg-surface p-3 transition-colors outline-none focus:border-primary ${blurredResolutionFields.reason && resolutionReasonValidation ? "border-danger/70" : "border-line"}`}
                    value={resolutionReason}
                    maxLength={256}
                    onBlur={() => markResolutionFieldBlurred("reason")}
                    onChange={(event) => setResolutionReason(event.target.value)}
                  />
                  <span className="h-10 overflow-hidden text-sm">
                    {blurredResolutionFields.reason && resolutionReasonValidation ? (
                      <span role="alert" className="text-danger">
                        {resolutionReasonValidation}
                      </span>
                    ) : (
                      <span className="text-muted">Máximo 256 bytes UTF-8.</span>
                    )}
                  </span>
                </label>
                <PrivacyWarning />
                {!resolution.ok && <p className="text-danger">{resolution.message}</p>}
                <div className="grid gap-4 rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">Resumen de la resolución</p>
                    <div className="text-right">
                      <Badge>100% distribuido</Badge>
                      <p className="mt-1 text-xs text-muted">
                        Total: {displayEth(snapshot.amount)}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-primary/5 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Worker · {workerPercentInput}%
                      </p>
                      <p className="mt-1 font-display text-xl font-bold">{allocation.worker} ETH</p>
                      <p className="break-all text-xs text-muted">
                        {workerAmountWei.toString()} wei
                      </p>
                    </div>
                    <div className="rounded-xl bg-accent/5 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                        Owner · {ownerPercentInput}%
                      </p>
                      <p className="mt-1 font-display text-xl font-bold">{allocation.owner} ETH</p>
                      <p className="break-all text-xs text-muted">
                        {(snapshot.amount - workerAmountWei).toString()} wei
                      </p>
                    </div>
                  </div>
                  <p className="break-words border-t border-line pt-3 text-sm text-muted">
                    <span className="font-semibold">Motivo:</span>{" "}
                    {resolutionReason || "Sin motivo"}
                  </p>
                </div>
                <p>Primero simularemos la transacción; tu wallet confirma la firma final.</p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={
                      !resolution.ok ||
                      isTransactionPending(transaction) ||
                      isEscrowTransactionPending(snapshot.address)
                    }
                    onClick={reviewAndResolveDispute}
                  >
                    {isTransactionPending(transaction)
                      ? "Procesando…"
                      : escrowSigningLabels.resolve}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={isTransactionPending(transaction)}
                    onClick={() => setReviewingResolution(false)}
                  >
                    Volver
                  </Button>
                </div>
                {hasTrackedTransaction(transaction) && (
                  <p role="status">Transacción enviada: {transaction.hash}</p>
                )}
                {(transaction.kind === "rejected" ||
                  transaction.kind === "reverted" ||
                  transaction.kind === "unknown-failure") && (
                  <div role="alert" className="text-danger">
                    <p>{transaction.message}</p>
                    <details className="text-xs text-muted overflow-auto">
                      <summary>Detalle técnico</summary>
                      <pre className="mt-2 whitespace-pre-wrap">{transaction.detail}</pre>
                    </details>
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>
      )}
      <Panel as="section">
        <h2 className="font-display text-2xl font-bold">Ciclo de vida</h2>
        <ol className="mt-5 grid gap-3 md:grid-cols-4">
          {projection.timeline.map((stage) => (
            <li
              key={stage.key}
              className={`rounded-lg border p-4 ${stage.deadlineElapsed ? "border-accent bg-accent/10" : stage.status === "current" ? "border-primary bg-primary/10" : "border-line"}`}
            >
              <p className="font-semibold">{stage.label}</p>
              <Badge>
                {stage.deadlineElapsed
                  ? "Actual · vencida, sin finalizar"
                  : stage.status === "expired"
                    ? "Finalizada por vencimiento"
                    : stage.status === "completed"
                      ? "Completada"
                      : stage.status === "current"
                        ? "Actual"
                        : "No iniciada"}
              </Badge>
              {stage.deadline === 0n ? (
                <div className="mt-3 text-sm text-muted">
                  <p>Duración al iniciar: {formatDuration(stage.duration ?? 0n)}</p>
                  <p>Comienza con {stage.startsAfter}.</p>
                </div>
              ) : stage.status === "current" ? (
                <div className="mt-3 text-sm text-muted">
                  <p className={stage.deadlineElapsed ? "font-semibold text-accent" : undefined}>
                    {formatDeadlineDistance(stage.deadline, now)}
                    {stage.deadlineElapsed ? " · sin finalizar" : ""}
                  </p>
                  <p>Fecha límite: {formatDeadlineDate(stage.deadline)}</p>
                </div>
              ) : stage.status === "expired" ? (
                <div className="mt-3 text-sm text-muted">
                  <p>{formatDeadlineDistance(stage.deadline, now)}</p>
                  <p>Fecha límite: {formatDeadlineDate(stage.deadline)}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  El plazo terminaba el {formatDeadlineDate(stage.deadline)}
                </p>
              )}
            </li>
          ))}
        </ol>
      </Panel>
      {(snapshot.submissionReference || snapshot.disputeReason || snapshot.resolutionReason) && (
        <Panel as="section">
          <h2 className="font-display text-2xl font-bold">Evidencia on-chain</h2>
          <dl className="grid gap-4">
            <Evidence label="Referencia de entrega" value={snapshot.submissionReference} link />
            <Evidence label="Motivo de disputa" value={snapshot.disputeReason} />
            <Evidence label="Motivo de resolución" value={snapshot.resolutionReason} />
          </dl>
        </Panel>
      )}
    </div>
  );
}
