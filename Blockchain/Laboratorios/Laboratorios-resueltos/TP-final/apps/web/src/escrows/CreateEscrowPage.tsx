import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAccount, useWriteContract } from "wagmi";
import { escrowFactoryAbi } from "@escrow/contracts";
import { formatEther, getAddress } from "viem";
import { config, publicClient } from "../runtime";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { useDiscardDirtyFormOnWalletChange, useResetAccountSensitiveState } from "../wallet/accountChange";
import { canWrite } from "../wallet/wallet";
import { WalletControls } from "../wallet/WalletControls";
import {
  createEscrowRequest,
  decodeCreatedEscrow,
  durationUnits,
  titleMaxBytes,
  translateCreationError,
  type EscrowDraft,
  type FriendlyDuration,
} from "./creation";

const initialDraft: EscrowDraft = {
  title: "",
  amountEth: "",
  worker: "",
  arbiter: "",
  acceptance: { value: "", unit: "days" },
  submission: { value: "", unit: "days" },
  review: { value: "", unit: "days" },
  arbitration: { value: "", unit: "days" },
};

type TransactionState =
  | { kind: "idle" }
  | { kind: "simulating" }
  | { kind: "wallet" }
  | { kind: "submitted"; hash: `0x${string}` }
  | { kind: "failure"; message: string; detail?: string; hash?: `0x${string}` };

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      {label}
      {children}
      {error && <span className="text-xs font-normal text-danger">{error}</span>}
    </label>
  );
}

function DurationField({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: FriendlyDuration;
  error?: string;
  onChange: (value: FriendlyDuration) => void;
}) {
  return (
    <Field label={label} error={error}>
      <span className="flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-ink"
          aria-label={`${label} duración`}
          inputMode="numeric"
          value={value.value}
          onChange={(event) => onChange({ ...value, value: event.target.value })}
        />
        <select
          className="rounded-lg border border-line bg-surface px-3 py-2 text-ink"
          aria-label={`${label} unidad`}
          value={value.unit}
          onChange={(event) => onChange({ ...value, unit: event.target.value as FriendlyDuration["unit"] })}
        >
          {Object.entries(durationUnits).map(([unit, data]) => (
            <option key={unit} value={unit}>
              {data.label}
            </option>
          ))}
        </select>
      </span>
    </Field>
  );
}

export function CreateEscrowPage() {
  const { address, chainId, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initialDraft);
  const [reviewing, setReviewing] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof EscrowDraft, string>>>({});
  const [transaction, setTransaction] = useState<TransactionState>({ kind: "idle" });
  const titleBytes = new TextEncoder().encode(draft.title).length;
  const request = createEscrowRequest(draft, address);
  const ready = request.ok ? request : undefined;
  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);

  useDiscardDirtyFormOnWalletChange(dirty, () => {
    setDraft(initialDraft);
    setReviewing(false);
    setErrors({});
    setTransaction({ kind: "idle" });
  });
  useResetAccountSensitiveState(() => setTransaction({ kind: "idle" }));

  useEffect(() => {
    if (isConnected) {
      const result = createEscrowRequest(draft, address);
      setErrors(result.ok ? {} : result.errors);
    }
  }, [address, isConnected]); // Revalidate roles when the owner account changes without altering the draft.

  function update<K extends keyof EscrowDraft>(key: K, value: EscrowDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setTransaction({ kind: "idle" });
  }

  function openReview() {
    const result = createEscrowRequest(draft, address);
    setErrors(result.ok ? {} : result.errors);
    if (result.ok) setReviewing(true);
  }

  async function submit() {
    const result = createEscrowRequest(draft, address);
    setErrors(result.ok ? {} : result.errors);
    if (!result.ok || !address || !canWrite(chainId)) return;
    let hash: `0x${string}` | undefined;
    try {
      setTransaction({ kind: "simulating" });
      const simulation = await publicClient.simulateContract({
        account: address,
        address: config.factoryAddress,
        abi: escrowFactoryAbi,
        functionName: "createEscrow",
        args: result.args,
        value: result.value,
      });
      setTransaction({ kind: "wallet" });
      hash = await writeContractAsync(simulation.request);
      setTransaction({ kind: "submitted", hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("La transacción se revirtió.");
      const emittedAddress = decodeCreatedEscrow(receipt.logs, config.factoryAddress);
      if (!emittedAddress) {
        setTransaction({
          kind: "failure",
          hash,
          message: "La transacción fue confirmada, pero no pudimos identificar el escrow creado.",
        });
        return;
      }
      const canonical = await publicClient.readContract({
        address: config.factoryAddress,
        abi: escrowFactoryAbi,
        functionName: "isEscrow",
        args: [emittedAddress],
      });
      if (!canonical) {
        setTransaction({
          kind: "failure",
          hash,
          message: "La transacción fue confirmada, pero la dirección emitida no es un escrow canónico.",
        });
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["escrows"] }),
        queryClient.invalidateQueries({ queryKey: ["my-escrows"] }),
      ]);
      await navigate({ to: "/escrows/$address", params: { address: getAddress(emittedAddress) } });
    } catch (error) {
      setTransaction({
        kind: "failure",
        message: translateCreationError(error),
        detail: error instanceof Error ? error.message : String(error),
        hash,
      });
    }
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <section className="border-t border-line pt-8">
        <p className="text-xs font-bold tracking-[0.12em] text-primary uppercase">Nuevo escrow</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Crear y financiar un escrow</h1>
        <p className="mt-3 text-muted">Prepará los términos. La wallet se solicita recién al revisar.</p>
      </section>

      {!reviewing ? (
        <form onSubmit={(event) => { event.preventDefault(); openReview(); }}>
        <Panel className="grid gap-5">
          <Field label="Título" error={errors.title}>
            <input aria-label="Título" className="rounded-lg border border-line bg-surface px-3 py-2 text-ink" value={draft.title} onChange={(event) => update("title", event.target.value)} />
            <span className="text-xs font-normal text-muted">{titleBytes}/{titleMaxBytes} bytes UTF-8</span>
          </Field>
          <Field label="Monto (ETH)" error={errors.amountEth}>
            <input aria-label="Monto (ETH)" className="rounded-lg border border-line bg-surface px-3 py-2 text-ink" inputMode="decimal" placeholder="0.0" value={draft.amountEth} onChange={(event) => update("amountEth", event.target.value)} />
          </Field>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Dirección del worker" error={errors.worker}>
              <input aria-label="Dirección del worker" className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-ink" spellCheck={false} value={draft.worker} onChange={(event) => update("worker", event.target.value)} />
            </Field>
            <Field label="Dirección del árbitro" error={errors.arbiter}>
              <input aria-label="Dirección del árbitro" className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-ink" spellCheck={false} value={draft.arbiter} onChange={(event) => update("arbiter", event.target.value)} />
            </Field>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <DurationField label="Aceptación" value={draft.acceptance} error={errors.acceptance} onChange={(value) => update("acceptance", value)} />
            <DurationField label="Entrega" value={draft.submission} error={errors.submission} onChange={(value) => update("submission", value)} />
            <DurationField label="Revisión" value={draft.review} error={errors.review} onChange={(value) => update("review", value)} />
            <DurationField label="Arbitraje" value={draft.arbitration} error={errors.arbitration} onChange={(value) => update("arbitration", value)} />
          </div>
          <p className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-accent">El título y todas las direcciones se publicarán de forma inmutable. No incluyas datos personales, credenciales ni secretos.</p>
          <Button type="submit">Revisar creación</Button>
        </Panel>
        </form>
      ) : (
        <Panel className="grid gap-5">
          <div>
            <p className="text-xs font-bold tracking-[0.12em] text-primary uppercase">Revisión</p>
            <h2 className="font-display text-3xl font-bold">Confirmá los datos on-chain</h2>
          </div>
          {ready ? (
            <dl className="grid gap-3 break-all text-sm">
              <div><dt className="text-muted">Título</dt><dd>{draft.title}</dd></div>
              <div><dt className="text-muted">Fondos exactos</dt><dd>{formatEther(ready.value)} ETH ({ready.value.toString()} wei)</dd></div>
              <div><dt className="text-muted">Worker</dt><dd className="font-mono">{ready.args[0]}</dd></div>
              <div><dt className="text-muted">Árbitro</dt><dd className="font-mono">{ready.args[1]}</dd></div>
              {(["Aceptación", "Entrega", "Revisión", "Arbitraje"] as const).map((label, index) => <div key={label}><dt className="text-muted">{label}</dt><dd>{ready.args[index + 2].toString()} segundos</dd></div>)}
            </dl>
          ) : (
            <p role="alert" className="text-danger">Corregí los datos antes de continuar. Al conectar se validarán también contra el owner.</p>
          )}
          <p className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-accent">Estos datos son públicos e inmutables. La simulación verifica la llamada antes de pedir la firma; la wallet es la confirmación final.</p>
          {!isConnected ? (
            <div className="grid gap-3"><p>Conectá una wallet para continuar con la revisión.</p><WalletControls /></div>
          ) : !canWrite(chainId) ? (
            <p role="alert" className="text-accent">Tu wallet debe usar Sepolia para crear el escrow.</p>
          ) : (
            <Button disabled={!ready || transaction.kind === "simulating" || transaction.kind === "wallet" || transaction.kind === "submitted"} onClick={submit}>
              {transaction.kind === "simulating" ? "Simulando…" : transaction.kind === "wallet" ? "Esperando confirmación…" : transaction.kind === "submitted" ? "Esperando confirmación on-chain…" : "Simular y firmar"}
            </Button>
          )}
          {transaction.kind === "submitted" && <p role="status">Transacción enviada: <a className="text-primary underline" href={`${config.explorerUrl}/tx/${transaction.hash}`} target="_blank" rel="noopener noreferrer">{transaction.hash}</a></p>}
          {transaction.kind === "failure" && <div role="alert" className="grid gap-2 text-danger"><p>{transaction.message}</p>{transaction.hash && <a className="text-primary underline" href={`${config.explorerUrl}/tx/${transaction.hash}`} target="_blank" rel="noopener noreferrer">Ver transacción confirmada</a>}{transaction.detail && <details className="text-xs text-muted"><summary>Detalle técnico</summary><pre className="mt-2 whitespace-pre-wrap">{transaction.detail}</pre></details>}</div>}
          <Button variant="ghost" onClick={() => { setReviewing(false); setTransaction({ kind: "idle" }); }}>Editar datos</Button>
        </Panel>
      )}
    </div>
  );
}
