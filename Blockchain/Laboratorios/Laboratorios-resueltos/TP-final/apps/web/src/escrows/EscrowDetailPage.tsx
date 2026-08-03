import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import type { Address } from "viem";
import { escrowAbi } from "@escrow/contracts";
import { useAccount, useWriteContract } from "wagmi";
import { config, publicClient } from "../runtime";
import { Badge } from "../ui/Badge";
import { Button, actionClassName } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { AddressDisplay } from "../ui/AddressDisplay";
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
  isTransactionPending,
  runEscrowTransaction,
  type TransactionState,
} from "../transactions/coordinator";
import { walletConnectionRequestEvent } from "../wallet/wallet";
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

type ResolutionField = "workerAmount" | "workerPercent" | "ownerAmount" | "ownerPercent" | "reason";

export function EscrowDetailPage() {
  const { address } = useParams({ from: "/escrows/$address" });
  const { address: account, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const [reviewingAcceptance, setReviewingAcceptance] = useState(false);
  const [reviewingLifecycleAction, setReviewingLifecycleAction] = useState<
    LifecycleWriteAction | undefined
  >();
  const [reviewingReviewAction, setReviewingReviewAction] = useState<
    "submit" | "approve" | "dispute" | undefined
  >();
  const [submissionReference, setSubmissionReference] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [reviewingResolution, setReviewingResolution] = useState(false);
  const [reviewingWithdrawal, setReviewingWithdrawal] = useState(false);
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
  const now = useChainTime(successfulResult?.blockTime ?? 0n, initialProjection?.activeDeadline);

  useEffect(() => {
    if (initialProjection?.activeDeadline && now >= initialProjection.activeDeadline) {
      void query.refetch();
    }
  }, [initialProjection?.activeDeadline, now, query]);

  useEffect(() => {
    setReviewingWithdrawal(false);
    setWithdrawalTransaction({ kind: "idle" });
  }, [account, chainId]);

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
      setReviewingAcceptance(false);
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
      setReviewingLifecycleAction(undefined);
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
      setReviewingReviewAction(undefined);
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
      setReviewingWithdrawal(false);
    }
  }

  function reviewLifecycleAction(action: LifecycleWriteAction) {
    setReviewingLifecycleAction(action);
    if (!account) window.dispatchEvent(new Event(walletConnectionRequestEvent));
  }

  const visitorExpirationAction = projection.deadlineElapsed
    ? (projectEscrow(snapshot, now).availableActions[0] as LifecycleWriteAction | undefined)
    : undefined;
  const lifecycleActions = projection.availableActions.filter(isLifecycleWriteAction);
  if (visitorExpirationAction && !lifecycleActions.includes(visitorExpirationAction))
    lifecycleActions.push(visitorExpirationAction);

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-xs font-bold tracking-[0.12em] text-primary uppercase">Escrow</p>
        <h1 className="my-3 font-display text-[clamp(2.4rem,7vw,5rem)] leading-none font-bold">
          {snapshot.title}
        </h1>
        <AddressDisplay address={snapshot.address} format="long" />
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge>{projection.stateLabel}</Badge>
          {projection.deadlineElapsed && (
            <Badge className="border-accent/40 bg-accent/10 text-accent">
              Plazo vencido · sin finalizar
            </Badge>
          )}
        </div>
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <Panel as="section">
          <h2 className="font-display text-2xl font-bold">Fondos y participantes</h2>
          <p className="text-3xl font-bold text-primary-strong">{displayEth(snapshot.amount)}</p>
          <dl className="grid gap-4">
            <EscrowParticipants
              account={account}
              owner={snapshot.owner}
              worker={snapshot.worker}
              arbiter={snapshot.arbiter}
            />
            {account && (
              <div>
                <dt className="text-sm text-muted">Tu saldo pendiente en este escrow</dt>
                <dd className="mt-1 font-mono" data-testid="pending-withdrawal">
                  {formatPendingWithdrawal(pendingWithdrawal)}
                </dd>
              </div>
            )}
          </dl>
        </Panel>
        <Panel as="section">
          <h2 className="font-display text-2xl font-bold">Acciones disponibles</h2>
          {availability.kind === "available" ? (
            <ul>
              {availability.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          ) : availability.kind === "wallet-required" ? (
            <p className="text-muted">
              {projection.deadlineElapsed
                ? "Conectá una wallet para finalizar el plazo vencido."
                : "Conectá una wallet para ver las acciones disponibles."}
            </p>
          ) : availability.kind === "wrong-network" ? (
            <p className="text-muted">Cambiá tu wallet a Sepolia para realizar acciones.</p>
          ) : availability.kind === "unavailable" ? (
            <p className="text-muted">No tenés acciones disponibles en esta etapa.</p>
          ) : null}
          {availability.kind === "terminal" && (
            <p className="text-muted">El ciclo de vida del escrow finalizó.</p>
          )}
          {projection.terminalOutcome && (
            <p>
              <strong>Resultado:</strong> {projection.terminalOutcome}
            </p>
          )}
        </Panel>
      </div>
      {canWithdrawFromEscrow(snapshot, account, chainId) && (
        <Panel as="section" className="grid gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Retirar fondos</h2>
            <p className="text-muted">Retirá el saldo disponible únicamente desde este escrow.</p>
          </div>
          {!reviewingWithdrawal ? (
            <Button onClick={() => setReviewingWithdrawal(true)}>Revisar retiro</Button>
          ) : (
            <div className="grid gap-3 rounded-lg border border-line p-4">
              <p>
                Vas a retirar{" "}
                <strong className="font-mono">{formatPendingWithdrawal(pendingWithdrawal)}</strong>{" "}
                desde el escrow <AddressDisplay address={snapshot.address} format="long" />.
              </p>
              <p>Primero simularemos la transacción; tu wallet confirma la firma final.</p>
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={
                    isTransactionPending(withdrawalTransaction) ||
                    isEscrowTransactionPending(snapshot.address)
                  }
                  onClick={withdraw}
                >
                  {withdrawalTransaction.kind === "simulating"
                    ? "Simulando…"
                    : withdrawalTransaction.kind === "wallet"
                      ? "Esperando confirmación…"
                      : withdrawalTransaction.kind === "submitted"
                        ? "Esperando confirmación on-chain…"
                        : "Simular y firmar retiro"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={isTransactionPending(withdrawalTransaction)}
                  onClick={() => setReviewingWithdrawal(false)}
                >
                  Volver
                </Button>
              </div>
            </div>
          )}
          {withdrawalTransaction.kind === "submitted" && (
            <p role="status">
              Transacción enviada:{" "}
              <a
                className="text-primary underline"
                href={`${config.explorerUrl}/tx/${withdrawalTransaction.hash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {withdrawalTransaction.hash}
              </a>
            </p>
          )}
          {(withdrawalTransaction.kind === "rejected" ||
            withdrawalTransaction.kind === "reverted" ||
            withdrawalTransaction.kind === "unknown-failure") &&
            reviewingWithdrawal && (
              <div role="alert" className="grid gap-2 text-danger">
                <p>{withdrawalTransaction.message}</p>
                <details className="text-xs text-muted">
                  <summary>Detalle técnico</summary>
                  <pre className="mt-2 whitespace-pre-wrap">{withdrawalTransaction.detail}</pre>
                </details>
              </div>
            )}
        </Panel>
      )}
      {withdrawalTransaction.kind === "confirmed" && (
        <Panel role="status">Retiro confirmado. El saldo pendiente fue actualizado.</Panel>
      )}
      {projection.availableActions.includes("Aceptar") && (
        <Panel as="section" className="grid gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Aceptar escrow</h2>
            <p className="text-muted">
              La aceptación inicia el plazo de entrega y no puede deshacerse.
            </p>
          </div>
          {!reviewingAcceptance ? (
            <Button onClick={() => setReviewingAcceptance(true)}>Revisar aceptación</Button>
          ) : (
            <div className="grid gap-3 rounded-lg border border-line p-4">
              <p>
                Vas a aceptar este escrow como worker. Primero simularemos la transacción; tu wallet
                confirma la firma final.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={
                    isTransactionPending(transaction) ||
                    isEscrowTransactionPending(snapshot.address)
                  }
                  onClick={accept}
                >
                  {transaction.kind === "simulating"
                    ? "Simulando…"
                    : transaction.kind === "wallet"
                      ? "Esperando confirmación…"
                      : transaction.kind === "submitted"
                        ? "Esperando confirmación on-chain…"
                        : "Simular y firmar aceptación"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={isTransactionPending(transaction)}
                  onClick={() => setReviewingAcceptance(false)}
                >
                  Volver
                </Button>
              </div>
            </div>
          )}
          {transaction.kind === "submitted" && (
            <p role="status">
              Transacción enviada:{" "}
              <a
                className="text-primary underline"
                href={`${config.explorerUrl}/tx/${transaction.hash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {transaction.hash}
              </a>
            </p>
          )}
          {(transaction.kind === "rejected" ||
            transaction.kind === "reverted" ||
            transaction.kind === "unknown-failure") && (
            <div role="alert" className="grid gap-2 text-danger">
              <p>{transaction.message}</p>
              {transaction.hash && (
                <a
                  className="text-primary underline"
                  href={`${config.explorerUrl}/tx/${transaction.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver transacción
                </a>
              )}
              <details className="text-xs text-muted">
                <summary>Detalle técnico</summary>
                <pre className="mt-2 whitespace-pre-wrap">{transaction.detail}</pre>
              </details>
            </div>
          )}
        </Panel>
      )}
      {(["Enviar trabajo", "Aprobar trabajo", "Abrir disputa"] as const).map((label) => {
        const action =
          label === "Enviar trabajo"
            ? "submit"
            : label === "Aprobar trabajo"
              ? "approve"
              : "dispute";
        const eligible =
          action === "submit" ? submission : action === "approve" ? approval : dispute;
        if (!projection.availableActions.includes(label)) return null;
        const value = action === "submit" ? submissionReference : disputeReason;
        const validation = action === "approve" ? undefined : validatePublicText(value, 256);
        const title = label;
        const consequence =
          action === "submit"
            ? "La referencia quedará pública e inmutable para que el owner revise la entrega."
            : action === "approve"
              ? "El monto completo quedará disponible para retiro del worker."
              : "El motivo quedará público e inmutable y se abrirá el arbitraje.";
        return (
          <Panel as="section" className="grid gap-4" key={action}>
            <div>
              <h2 className="font-display text-2xl font-bold">{title}</h2>
              <p className="text-muted">{consequence}</p>
            </div>
            {reviewingReviewAction !== action ? (
              <Button onClick={() => setReviewingReviewAction(action)}>Revisar consecuencia</Button>
            ) : (
              <div className="grid gap-3 rounded-lg border border-line p-4">
                {action !== "approve" && (
                  <label className="grid gap-1">
                    <span>
                      {action === "submit" ? "Referencia de entrega" : "Motivo de disputa"}
                    </span>
                    <textarea
                      className="min-h-24 rounded-lg border border-line bg-transparent p-3"
                      value={value}
                      maxLength={256}
                      onChange={(event) =>
                        action === "submit"
                          ? setSubmissionReference(event.target.value)
                          : setDisputeReason(event.target.value)
                      }
                    />
                    <span className="text-sm text-muted">Máximo 256 bytes UTF-8.</span>
                  </label>
                )}
                {action !== "approve" && (
                  <p className="text-sm text-accent">
                    Este texto será público e inmutable. No incluyas datos personales, credenciales
                    ni secretos.
                  </p>
                )}
                {validation && (
                  <p role="alert" className="text-danger">
                    {validation}
                  </p>
                )}
                <p>Primero simularemos la transacción; tu wallet confirma la firma final.</p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={
                      !!validation ||
                      !eligible.ok ||
                      isTransactionPending(transaction) ||
                      isEscrowTransactionPending(snapshot.address)
                    }
                    onClick={() => runReviewAction(action)}
                  >
                    {isTransactionPending(transaction) ? "Procesando…" : "Simular y firmar"}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={isTransactionPending(transaction)}
                    onClick={() => setReviewingReviewAction(undefined)}
                  >
                    Volver
                  </Button>
                </div>
                {!eligible.ok && <p className="text-danger">{eligible.message}</p>}
                {transaction.kind === "submitted" && (
                  <p role="status">
                    Transacción enviada:{" "}
                    <a
                      className="text-primary underline"
                      href={`${config.explorerUrl}/tx/${transaction.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {transaction.hash}
                    </a>
                  </p>
                )}
                {(transaction.kind === "rejected" ||
                  transaction.kind === "reverted" ||
                  transaction.kind === "unknown-failure") && (
                  <div role="alert" className="text-danger">
                    <p>{transaction.message}</p>
                    <details className="text-xs text-muted">
                      <summary>Detalle técnico</summary>
                      <pre className="mt-2 whitespace-pre-wrap">{transaction.detail}</pre>
                    </details>
                  </div>
                )}
              </div>
            )}
          </Panel>
        );
      })}
      {projection.availableActions.includes("Resolver disputa") && (
        <Panel as="section" className="grid gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Resolver disputa</h2>
            <p className="text-muted">
              Asigná el monto exacto al worker; el owner recibe siempre el remanente exacto.
            </p>
          </div>
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
                    <span className="min-h-10 text-sm">
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
                    <span className="min-h-10 text-sm">
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
                    <span className="min-h-10 text-sm">
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
                    <span className="min-h-10 text-sm">
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
                <input
                  aria-label="Reparto entre worker y owner"
                  type="range"
                  min="0"
                  max={allocationSliderSteps.toString()}
                  value={workerSliderValue}
                  onChange={(event) =>
                    setWorkerAllocation(
                      allocationFromWorkerSlider(Number(event.target.value), snapshot.amount),
                    )
                  }
                />
                <div>
                  <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-muted">
                    Worker / Owner
                  </p>
                  <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-line bg-surface-raised p-1">
                    {[
                      ["0", "0 / 100"],
                      ["50", "50 / 50"],
                      ["100", "100 / 0"],
                    ].map(([workerPercent, label]) => (
                      <Button
                        key={workerPercent}
                        variant="ghost"
                        aria-label={`Reparto ${label}`}
                        aria-pressed={activeAllocationPreset === workerPercent}
                        className={`rounded-lg border-transparent px-2 transition-colors ${activeAllocationPreset === workerPercent ? "border-primary/50 bg-primary/15 text-primary-strong" : "text-muted hover:text-primary-strong"}`}
                        onClick={() => setPercentAllocation(workerPercent, "worker")}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <label className="grid gap-2">
                <span className="font-semibold">Motivo de resolución</span>
                <textarea
                  className={`min-h-28 resize-y rounded-xl border bg-surface p-3 transition-colors outline-none focus:border-primary ${resolutionReasonValidation ? "border-danger/70" : "border-line"}`}
                  value={resolutionReason}
                  maxLength={256}
                  onBlur={() => markResolutionFieldBlurred("reason")}
                  onChange={(event) => setResolutionReason(event.target.value)}
                />
                <span className="min-h-10 text-sm">
                  {blurredResolutionFields.reason && resolutionReasonValidation ? (
                    <span role="alert" className="text-danger">
                      {resolutionReasonValidation}
                    </span>
                  ) : (
                    <span className="text-muted">Máximo 256 bytes UTF-8.</span>
                  )}
                </span>
              </label>
              <p className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-sm text-accent">
                El motivo será público e inmutable. No incluyas datos personales, credenciales ni
                secretos.
              </p>
              {!resolution.ok && <p className="text-danger">{resolution.message}</p>}
              <div className="grid gap-4 rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">Resumen de la resolución</p>
                  <Badge>100% distribuido</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-primary/5 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Worker · {workerPercentInput}%
                    </p>
                    <p className="mt-1 font-display text-xl font-bold">{allocation.worker} ETH</p>
                    <p className="break-all text-xs text-muted">{workerAmountWei.toString()} wei</p>
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
                  <span className="font-semibold">Motivo:</span> {resolutionReason || "Sin motivo"}
                </p>
              </div>
              <p>Primero simularemos la transacción; tu wallet confirma la firma final.</p>
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={
                    !!allocationInputError ||
                    !!resolutionReasonValidation ||
                    !resolution.ok ||
                    isTransactionPending(transaction) ||
                    isEscrowTransactionPending(snapshot.address)
                  }
                  onClick={resolveDispute}
                >
                  {isTransactionPending(transaction)
                    ? "Procesando…"
                    : "Simular y firmar resolución"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={isTransactionPending(transaction)}
                  onClick={() => setReviewingResolution(false)}
                >
                  Volver
                </Button>
              </div>
              {transaction.kind === "submitted" && (
                <p role="status">Transacción enviada: {transaction.hash}</p>
              )}
              {(transaction.kind === "rejected" ||
                transaction.kind === "reverted" ||
                transaction.kind === "unknown-failure") && (
                <div role="alert" className="text-danger">
                  <p>{transaction.message}</p>
                  <details className="text-xs text-muted">
                    <summary>Detalle técnico</summary>
                    <pre className="mt-2 whitespace-pre-wrap">{transaction.detail}</pre>
                  </details>
                </div>
              )}
            </div>
          )}
        </Panel>
      )}
      {lifecycleActions.map((action) => {
        const detail = lifecycleWriteDetail(action);
        const connectedAndEligible = projection.availableActions.includes(action);
        return (
          <Panel as="section" className="grid gap-4" key={action}>
            <div>
              <h2 className="font-display text-2xl font-bold">{action}</h2>
              <p className="text-muted">{detail.consequence}</p>
            </div>
            {reviewingLifecycleAction !== action ? (
              <Button onClick={() => reviewLifecycleAction(action)}>Revisar consecuencia</Button>
            ) : !account ? (
              <div className="flex items-center gap-3 rounded-lg border border-line p-4">
                <p>Conectá una wallet para continuar con esta acción: </p>
                <WalletControls />
              </div>
            ) : !connectedAndEligible ? (
              <div className="grid gap-3 rounded-lg border border-line p-4">
                <p className="text-muted">Esta cuenta no puede realizar la acción seleccionada.</p>
                <Button variant="ghost" onClick={() => setReviewingLifecycleAction(undefined)}>
                  Volver
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 rounded-lg border border-line p-4">
                <p>
                  {detail.consequence} Primero simularemos la transacción; tu wallet confirma la
                  firma final.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={
                      isTransactionPending(transaction) ||
                      isEscrowTransactionPending(snapshot.address)
                    }
                    onClick={() => runLifecycleAction(action)}
                  >
                    {transaction.kind === "simulating"
                      ? "Simulando…"
                      : transaction.kind === "wallet"
                        ? "Esperando confirmación…"
                        : transaction.kind === "submitted"
                          ? "Esperando confirmación on-chain…"
                          : "Simular y firmar"}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={isTransactionPending(transaction)}
                    onClick={() => setReviewingLifecycleAction(undefined)}
                  >
                    Volver
                  </Button>
                </div>
              </div>
            )}
          </Panel>
        );
      })}
      {transaction.kind === "submitted" && reviewingLifecycleAction && (
        <p role="status">
          Transacción enviada:{" "}
          <a
            className="text-primary underline"
            href={`${config.explorerUrl}/tx/${transaction.hash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {transaction.hash}
          </a>
        </p>
      )}
      {(transaction.kind === "rejected" ||
        transaction.kind === "reverted" ||
        transaction.kind === "unknown-failure") &&
        reviewingLifecycleAction && (
          <div role="alert" className="grid gap-2 text-danger">
            <p>{transaction.message}</p>
            <details className="text-xs text-muted">
              <summary>Detalle técnico</summary>
              <pre className="mt-2 whitespace-pre-wrap">{transaction.detail}</pre>
            </details>
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
      <Panel as="section">
        <h2 className="font-display text-2xl font-bold">Evidencia on-chain</h2>
        <dl className="grid gap-4">
          <Evidence label="Referencia de entrega" value={snapshot.submissionReference} link />
          <Evidence label="Motivo de disputa" value={snapshot.disputeReason} />
          <Evidence label="Motivo de resolución" value={snapshot.resolutionReason} />
          {!snapshot.submissionReference &&
            !snapshot.disputeReason &&
            !snapshot.resolutionReason && (
              <p className="text-muted">Todavía no hay evidencia registrada.</p>
            )}
        </dl>
      </Panel>
    </div>
  );
}
