import { immutableTextPrivacyWarning } from "../escrows/domainLabels";

export function PrivacyWarning({ className = "" }: { className?: string }) {
  return (
    <p
      className={`rounded-xl border border-accent/20 bg-accent/5 p-3 text-sm text-accent ${className}`}
    >
      {immutableTextPrivacyWarning}
    </p>
  );
}
