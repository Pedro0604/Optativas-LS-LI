import { useState } from "react";
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
import { escrowDetailQuery, projectEscrow, safeSubmissionUrl } from "./detail";
import { formatDeadlineDate, formatDeadlineDistance, formatDuration, useChainTime } from "./time";
import { canAcceptEscrow } from "./acceptance";
import {
  isEscrowTransactionPending,
  isTransactionPending,
  runEscrowTransaction,
  type TransactionState,
} from "../transactions/coordinator";

function AddressRow({ label, address }: { label: string; address: Address }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1">
        <AddressDisplay address={address} format="long" />
      </dd>
    </div>
  );
}

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

export function EscrowDetailPage() {
  const { address } = useParams({ from: "/escrows/$address" });
  const { address: account, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const [reviewingAcceptance, setReviewingAcceptance] = useState(false);
  const [transaction, setTransaction] = useState<TransactionState>({ kind: "idle" });
  const query = useQuery(
    escrowDetailQuery(publicClient, config.factoryAddress, address as Address),
  );
  const successfulResult = query.data && "snapshot" in query.data ? query.data : undefined;
  const initialProjection = successfulResult
    ? projectEscrow(successfulResult.snapshot, successfulResult.blockTime, { account, chainId })
    : undefined;
  const now = useChainTime(successfulResult?.blockTime ?? 0n, initialProjection?.activeDeadline);

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
  const acceptance = canAcceptEscrow(snapshot, account, now, chainId);

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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["escrow", snapshot.address] }),
        queryClient.invalidateQueries({ queryKey: ["escrows"] }),
        queryClient.invalidateQueries({ queryKey: ["my-escrows"] }),
      ]);
      setReviewingAcceptance(false);
    }
  }
  return (
    <div className="grid gap-6">
      <section className="border-t border-line pt-8">
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
            <AddressRow label="Owner" address={snapshot.owner} />
            <AddressRow label="Worker" address={snapshot.worker} />
            <AddressRow label="Árbitro" address={snapshot.arbiter} />
          </dl>
        </Panel>
        <Panel as="section">
          <h2 className="font-display text-2xl font-bold">Acciones disponibles</h2>
          {projection.availableActions.length ? (
            <ul>
              {projection.availableActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">El escrow alcanzó un estado final.</p>
          )}
          {projection.terminalOutcome && (
            <p>
              <strong>Resultado:</strong> {projection.terminalOutcome}
            </p>
          )}
        </Panel>
      </div>
      {projection.availableActions.includes("Aceptar") && (
        <Panel as="section" className="grid gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Aceptar escrow</h2>
            <p className="text-muted">La aceptación inicia el plazo de entrega y no puede deshacerse.</p>
          </div>
          {!reviewingAcceptance ? (
            <Button onClick={() => setReviewingAcceptance(true)}>Revisar aceptación</Button>
          ) : (
            <div className="grid gap-3 rounded-lg border border-line p-4">
              <p>Vas a aceptar este escrow como worker. Primero simularemos la transacción; tu wallet confirma la firma final.</p>
              <div className="flex flex-wrap gap-3">
                <Button disabled={isTransactionPending(transaction) || isEscrowTransactionPending(snapshot.address)} onClick={accept}>
                  {transaction.kind === "simulating"
                    ? "Simulando…"
                    : transaction.kind === "wallet"
                      ? "Esperando confirmación…"
                      : transaction.kind === "submitted"
                        ? "Esperando confirmación on-chain…"
                        : "Simular y firmar aceptación"}
                </Button>
                <Button variant="ghost" disabled={isTransactionPending(transaction)} onClick={() => setReviewingAcceptance(false)}>Volver</Button>
              </div>
            </div>
          )}
          {transaction.kind === "submitted" && (
            <p role="status">Transacción enviada: <a className="text-primary underline" href={`${config.explorerUrl}/tx/${transaction.hash}`} target="_blank" rel="noopener noreferrer">{transaction.hash}</a></p>
          )}
          {(transaction.kind === "rejected" || transaction.kind === "reverted" || transaction.kind === "unknown-failure") && (
            <div role="alert" className="grid gap-2 text-danger">
              <p>{transaction.message}</p>
              {transaction.hash && <a className="text-primary underline" href={`${config.explorerUrl}/tx/${transaction.hash}`} target="_blank" rel="noopener noreferrer">Ver transacción</a>}
              <details className="text-xs text-muted"><summary>Detalle técnico</summary><pre className="mt-2 whitespace-pre-wrap">{transaction.detail}</pre></details>
            </div>
          )}
        </Panel>
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
