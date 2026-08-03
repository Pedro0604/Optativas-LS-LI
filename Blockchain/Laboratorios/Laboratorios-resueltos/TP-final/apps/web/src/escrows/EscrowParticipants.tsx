import type { Address } from "viem";
import { AddressDisplay } from "../ui/AddressDisplay";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { walletConnectionRequestEvent } from "../wallet/wallet";
import { escrowRoleNames } from "./domainLabels";
import type { EscrowRole } from "./myEscrows";

type EscrowParticipantsProps = {
  account?: Address;
  owner: Address;
  worker: Address;
  arbiter: Address;
};

function participantRole(
  account: Address | undefined,
  participants: Omit<EscrowParticipantsProps, "account">,
): EscrowRole | undefined {
  const normalized = account?.toLowerCase();
  if (normalized === participants.owner.toLowerCase()) return "owner";
  if (normalized === participants.worker.toLowerCase()) return "worker";
  if (normalized === participants.arbiter.toLowerCase()) return "arbiter";
  return undefined;
}

function AddressRow({
  role,
  address,
  isCurrentAccount,
}: {
  role: EscrowRole;
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
        {escrowRoleNames[role]}
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
              <Badge>{escrowRoleNames[role]}</Badge>
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
      <AddressRow role="owner" address={owner} isCurrentAccount={role === "owner"} />
      <AddressRow role="worker" address={worker} isCurrentAccount={role === "worker"} />
      <AddressRow role="arbiter" address={arbiter} isCurrentAccount={role === "arbiter"} />
    </>
  );
}
