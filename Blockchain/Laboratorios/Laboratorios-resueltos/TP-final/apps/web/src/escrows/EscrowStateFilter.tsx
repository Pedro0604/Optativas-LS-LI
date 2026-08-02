import {
  escrowStateMetadata,
  escrowStates,
  parseEscrowState,
  type StateFilter,
} from "./EscrowState";

type EscrowStateFilterProps = {
  value: StateFilter;
  onChange: (state: StateFilter) => void;
};

export function EscrowStateFilter({ value, onChange }: EscrowStateFilterProps) {
  return (
    <label>
      Estado{" "}
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value === "all" ? "all" : parseEscrowState(event.target.value))
        }
      >
        <option value="all">Todos en esta página</option>
        {escrowStates.map((state) => (
          <option value={state} key={state}>
            {escrowStateMetadata[state].label}
          </option>
        ))}
      </select>
    </label>
  );
}
