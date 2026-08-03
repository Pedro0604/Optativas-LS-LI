import type { Address } from "viem";
import { AddressDisplay } from "../ui/AddressDisplay";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { walletConnectionRequestEvent } from "../wallet/wallet";

type ParticipantRole = "Owner" | "Worker" | "Árbitro";

type EscrowParticipantsProps = {
  account?: Address;
  owner: Address;
  worker: Address;
  arbiter: Address;
};

function participantRole(
  account: Address | undefined,
  participants: Omit<EscrowParticipantsProps, "account">,
): ParticipantRole | undefined {
  const normalized = account?.toLowerCase();
  if (normalized === participants.owner.toLowerCase()) return "Owner";
  if (normalized === participants.worker.toLowerCase()) return "Worker";
  if (normalized === participants.arbiter.toLowerCase()) return "Árbitro";
  return undefined;
}

function AddressRow({
  label,
  address,
  isCurrentAccount,
}: {
  label: ParticipantRole;
  address: Address;
  isCurrentAccount: boolean;
}) {
  return (
    <div
      className={
        isCurrentAccount ? "rounded-lg border border-primary/30 bg-primary/10 p-3" : undefined
      }
    >
      <dt className="flex items-center gap-2 text-sm text-muted">
        {label}
        {isCurrentAccount && <Badge>Vos</Badge>}
      </dt>
      <dd className="mt-1">
        <AddressDisplay address={address} format="long" />
      </dd>
    </div>
  );
}

export function EscrowParticipants({ account, owner, worker, arbiter }: EscrowParticipantsProps) {
  const participants = { owner, worker, arbiter };
  const role = participantRole(account, participants);

  return (
    <>
      <div className="flex items-center gap-2">
        <dt className="text-sm text-muted">Tu rol en este escrow:</dt>
        <dd className="font-semibold">
          {account ? (
            role ? (
              <Badge>{role}</Badge>
            ) : (
              "No sos participante"
            )
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              Conectá tu wallet para identificarlo
            </span>
          )}
        </dd>
      </div>
      <AddressRow label="Owner" address={owner} isCurrentAccount={role === "Owner"} />
      <AddressRow label="Worker" address={worker} isCurrentAccount={role === "Worker"} />
      <AddressRow label="Árbitro" address={arbiter} isCurrentAccount={role === "Árbitro"} />
    </>
  );
}
