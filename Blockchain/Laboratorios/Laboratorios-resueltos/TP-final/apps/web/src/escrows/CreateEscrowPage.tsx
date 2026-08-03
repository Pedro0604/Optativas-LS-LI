import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAccount, useWriteContract } from "wagmi";
import { escrowFactoryAbi } from "@escrow/contracts";
import { formatEther, getAddress } from "viem";
import { config, publicClient } from "../runtime";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import {
  useDiscardDirtyFormOnWalletChange,
  useResetAccountSensitiveState,
} from "../wallet/accountChange";
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

const draftKeys = Object.keys(initialDraft) as (keyof EscrowDraft)[];
type DraftErrors = Partial<Record<keyof EscrowDraft, string>>;
type TouchedFields = Partial<Record<keyof EscrowDraft, boolean>>;

function visibleErrors(
  draft: EscrowDraft,
  owner: `0x${string}` | undefined,
  touched: TouchedFields,
): DraftErrors {
  const result = createEscrowRequest(draft, owner);
  const validationErrors = result.ok ? {} : result.errors;
  return draftKeys.reduce<DraftErrors>((visible, key) => {
    if (touched[key] && validationErrors[key]) visible[key] = validationErrors[key];
    return visible;
  }, {});
}

type TransactionState =
  | { kind: "idle" }
  | { kind: "simulating" }
  | { kind: "wallet" }
  | { kind: "submitted"; hash: `0x${string}` }
  | { kind: "failure"; message: string; detail?: string; hash?: `0x${string}` };

function Field({
  label,
  error,
  errorId,
  children,
}: {
  label: string;
  error?: string;
  errorId: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      {label}
      {children}
      {error && (
        <span id={errorId} className="text-xs font-normal text-danger">
          {error}
        </span>
      )}
    </label>
  );
}

function DurationField({
  label,
  name,
  value,
  error,
  onBlur,
  onChange,
}: {
  label: string;
  name: keyof EscrowDraft;
  value: FriendlyDuration;
  error?: string;
  onBlur: () => void;
  onChange: (value: FriendlyDuration) => void;
}) {
  const errorId = `${name}-error`;
  return (
    <Field label={label} error={error} errorId={errorId}>
      <span className="flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-ink"
          aria-label={`${label} duración`}
          inputMode="numeric"
          data-escrow-field={name}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          value={value.value}
          onBlur={onBlur}
          onChange={(event) => onChange({ ...value, value: event.target.value })}
        />
        <select
          className="rounded-lg border border-line bg-surface px-3 py-2 text-ink"
          aria-label={`${label} unidad`}
          value={value.unit}
          onChange={(event) =>
            onChange({ ...value, unit: event.target.value as FriendlyDuration["unit"] })
          }
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
  const [errors, setErrors] = useState<DraftErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});
  const [transaction, setTransaction] = useState<TransactionState>({ kind: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  const titleBytes = new TextEncoder().encode(draft.title).length;
  const request = createEscrowRequest(draft, address);
  const ready = request.ok ? request : undefined;
  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);

  useDiscardDirtyFormOnWalletChange(dirty, () => {
    setDraft(initialDraft);
    setReviewing(false);
    setErrors({});
    setTouched({});
    setTransaction({ kind: "idle" });
  });
  useResetAccountSensitiveState(() => setTransaction({ kind: "idle" }));

  useEffect(() => {
    setErrors(visibleErrors(draft, address, touched));
  }, [address, isConnected]); // Revalidate roles when the owner account changes without altering the draft.

  function update<K extends keyof EscrowDraft>(key: K, value: EscrowDraft[K]) {
    const nextDraft = { ...draft, [key]: value };
    setDraft(nextDraft);
    if (touched[key]) setErrors(visibleErrors(nextDraft, address, touched));
    setTransaction({ kind: "idle" });
  }

  function touch(key: keyof EscrowDraft) {
    const nextTouched = { ...touched, [key]: true };
    setTouched(nextTouched);
    setErrors(visibleErrors(draft, address, nextTouched));
  }

  function openReview() {
    const result = createEscrowRequest(draft, address);
    setErrors(result.ok ? {} : result.errors);
    setTouched(Object.fromEntries(draftKeys.map((key) => [key, true])) as TouchedFields);
    if (result.ok) {
      setReviewing(true);
      return;
    }
    const firstInvalid = draftKeys.find((key) => result.errors[key]);
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[data-escrow-field="${firstInvalid}"]`)?.focus();
    }
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
          message:
            "La transacción fue confirmada, pero la dirección emitida no es un escrow canónico.",
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
      <section className="pt-8">
        <p className="text-xs font-bold tracking-[0.12em] text-primary uppercase">Nuevo escrow</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Crear y financiar un escrow</h1>
        <p className="mt-3 text-muted">
          Prepará los términos. La wallet se solicita recién al revisar.
        </p>
      </section>

      {!reviewing ? (
        <form
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault();
            openReview();
          }}
        >
          <Panel className="grid gap-5">
            <Field label="Título" error={errors.title} errorId="title-error">
              <input
                aria-label="Título"
                data-escrow-field="title"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "title-error" : undefined}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-ink"
                value={draft.title}
                onBlur={() => touch("title")}
                onChange={(event) => update("title", event.target.value)}
              />
              <span className="text-xs font-normal text-muted">
                {titleBytes}/{titleMaxBytes} bytes UTF-8
              </span>
            </Field>
            <Field label="Monto (ETH)" error={errors.amountEth} errorId="amountEth-error">
              <input
                aria-label="Monto (ETH)"
                data-escrow-field="amountEth"
                aria-invalid={Boolean(errors.amountEth)}
                aria-describedby={errors.amountEth ? "amountEth-error" : undefined}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-ink"
                inputMode="decimal"
                placeholder="0.0"
                value={draft.amountEth}
                onBlur={() => touch("amountEth")}
                onChange={(event) => update("amountEth", event.target.value)}
              />
            </Field>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Dirección del worker" error={errors.worker} errorId="worker-error">
                <input
                  aria-label="Dirección del worker"
                  data-escrow-field="worker"
                  aria-invalid={Boolean(errors.worker)}
                  aria-describedby={errors.worker ? "worker-error" : undefined}
                  className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-ink"
                  spellCheck={false}
                  value={draft.worker}
                  onBlur={() => touch("worker")}
                  onChange={(event) => update("worker", event.target.value)}
                />
              </Field>
              <Field label="Dirección del árbitro" error={errors.arbiter} errorId="arbiter-error">
                <input
                  aria-label="Dirección del árbitro"
                  data-escrow-field="arbiter"
                  aria-invalid={Boolean(errors.arbiter)}
                  aria-describedby={errors.arbiter ? "arbiter-error" : undefined}
                  className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-ink"
                  spellCheck={false}
                  value={draft.arbiter}
                  onBlur={() => touch("arbiter")}
                  onChange={(event) => update("arbiter", event.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <DurationField
                label="Aceptación"
                name="acceptance"
                value={draft.acceptance}
                error={errors.acceptance}
                onBlur={() => touch("acceptance")}
                onChange={(value) => update("acceptance", value)}
              />
              <DurationField
                label="Entrega"
                name="submission"
                value={draft.submission}
                error={errors.submission}
                onBlur={() => touch("submission")}
                onChange={(value) => update("submission", value)}
              />
              <DurationField
                label="Revisión"
                name="review"
                value={draft.review}
                error={errors.review}
                onBlur={() => touch("review")}
                onChange={(value) => update("review", value)}
              />
              <DurationField
                label="Arbitraje"
                name="arbitration"
                value={draft.arbitration}
                error={errors.arbitration}
                onBlur={() => touch("arbitration")}
                onChange={(value) => update("arbitration", value)}
              />
            </div>
            <p className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
              El título y todas las direcciones se publicarán de forma inmutable. No incluyas datos
              personales, credenciales ni secretos.
            </p>
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
              <div>
                <dt className="text-muted">Título</dt>
                <dd>{draft.title}</dd>
              </div>
              <div>
                <dt className="text-muted">Fondos exactos</dt>
                <dd>
                  {formatEther(ready.value)} ETH ({ready.value.toString()} wei)
                </dd>
              </div>
              <div>
                <dt className="text-muted">Worker</dt>
                <dd className="font-mono">{ready.args[0]}</dd>
              </div>
              <div>
                <dt className="text-muted">Árbitro</dt>
                <dd className="font-mono">{ready.args[1]}</dd>
              </div>
              {(["Aceptación", "Entrega", "Revisión", "Arbitraje"] as const).map((label, index) => (
                <div key={label}>
                  <dt className="text-muted">{label}</dt>
                  <dd>{ready.args[index + 2].toString()} segundos</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p role="alert" className="text-danger">
              Corregí los datos antes de continuar. Al conectar se validarán también contra el
              owner.
            </p>
          )}
          <p className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
            Estos datos son públicos e inmutables. La simulación verifica la llamada antes de pedir
            la firma; la wallet es la confirmación final.
          </p>
          {!isConnected ? (
            <div className="flex items-center gap-3">
              <p>Conectá una wallet para continuar con la revisión: </p>
              <WalletControls />
            </div>
          ) : !canWrite(chainId) ? (
            <p role="alert" className="text-accent">
              Tu wallet debe usar Sepolia para crear el escrow.
            </p>
          ) : (
            <Button
              disabled={
                !ready ||
                transaction.kind === "simulating" ||
                transaction.kind === "wallet" ||
                transaction.kind === "submitted"
              }
              onClick={submit}
            >
              {transaction.kind === "simulating"
                ? "Simulando…"
                : transaction.kind === "wallet"
                  ? "Esperando confirmación…"
                  : transaction.kind === "submitted"
                    ? "Esperando confirmación on-chain…"
                    : "Simular y firmar"}
            </Button>
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
          {transaction.kind === "failure" && (
            <div role="alert" className="grid gap-2 text-danger">
              <p>{transaction.message}</p>
              {transaction.hash && (
                <a
                  className="text-primary underline"
                  href={`${config.explorerUrl}/tx/${transaction.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver transacción confirmada
                </a>
              )}
              {transaction.detail && (
                <details className="text-xs text-muted">
                  <summary>Detalle técnico</summary>
                  <pre className="mt-2 whitespace-pre-wrap">{transaction.detail}</pre>
                </details>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              setReviewing(false);
              setTransaction({ kind: "idle" });
            }}
          >
            Editar datos
          </Button>
        </Panel>
      )}
    </div>
  );
}
