import {
  escrowStateMetadata,
  escrowStates,
  parseEscrowState,
  type StateFilter,
} from "./EscrowState";
import { Select } from "../ui/Select";

type EscrowStateFilterProps = {
  value: StateFilter;
  onChange: (state: StateFilter) => void;
};

export function EscrowStateFilter({ value, onChange }: EscrowStateFilterProps) {
  const options = [
    { value: "all", label: "Todos en esta página" },
    ...escrowStates.map((state) => ({
      value: String(state),
      label: escrowStateMetadata[state].label,
    })),
  ];

  return (
    <Select
      label="Estado"
      value={String(value)}
      options={options}
      onValueChange={(nextValue) =>
        onChange(nextValue === "all" ? "all" : parseEscrowState(nextValue))
      }
    />
  );
}
