import { Link } from "@tanstack/react-router";
import { displayEth, type EscrowSummary } from "./discovery";
import { escrowStateMetadata } from "./EscrowState";
import { Badge } from "../ui/Badge";
import { actionClassName } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { AddressDisplay } from "../ui/AddressDisplay";
import { isOperationalEscrowState } from "./EscrowState";
import { formatDeadlineDate, formatDeadlineDistance, useChainTime } from "./time";

type EscrowCardProps = { summary: EscrowSummary; chainTime: bigint };

export function EscrowCard({ summary, chainTime }: EscrowCardProps) {
  const activeDeadline = isOperationalEscrowState(summary.state) ? summary.deadline : undefined;
  const now = useChainTime(chainTime, activeDeadline);
  return (
    <Panel as="li" className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <h2 className="mb-3 font-display text-xl font-bold">{summary.title}</h2>
        <Badge>{escrowStateMetadata[summary.state].label}</Badge>
      </div>
      <strong className="text-lg text-primary-strong">{displayEth(summary.amount)}</strong>
      {summary.pendingWithdrawal !== undefined && summary.pendingWithdrawal > 0n && (
        <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm text-muted">Tu saldo pendiente:</p>
          <strong className="font-mono text-primary-strong">
            {displayEth(summary.pendingWithdrawal)}
          </strong>
        </div>
      )}
      <dl className="my-4 border-y border-line py-3 flex flex-col gap-2">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Owner</dt>
          <dd className="m-0">
            <AddressDisplay address={summary.owner} format="short" />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Worker</dt>
          <dd className="m-0">
            <AddressDisplay address={summary.worker} format="short" />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Árbitro</dt>
          <dd className="m-0">
            <AddressDisplay address={summary.arbiter} format="short" />
          </dd>
        </div>
      </dl>
      {activeDeadline !== undefined && activeDeadline > 0n && (
        <div className="text-sm text-muted">
          <p className={now >= activeDeadline ? "font-semibold text-accent" : undefined}>
            {formatDeadlineDistance(activeDeadline, now)}
          </p>
          <p className="mb-2">
            Fecha límite:{" "}
            <time dateTime={new Date(Number(activeDeadline) * 1000).toISOString()}>
              {formatDeadlineDate(activeDeadline)}
            </time>
          </p>
        </div>
      )}
      <Link
        to="/escrows/$address"
        params={{ address: summary.address }}
        className={`${actionClassName} mt-auto self-start`}
      >
        Ver detalle
      </Link>
    </Panel>
  );
}
