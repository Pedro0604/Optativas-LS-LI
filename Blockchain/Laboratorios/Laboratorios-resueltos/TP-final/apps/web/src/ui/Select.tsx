import { CheckIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import * as SelectPrimitive from "radix-ui/select";

type SelectOption = { value: string; label: string };

type SelectProps = {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onValueChange: (value: string) => void;
};

export function Select({ label, value, options, onValueChange }: SelectProps) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      {label}
      <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
        <SelectPrimitive.Trigger
          className="inline-flex min-w-48 cursor-pointer items-center justify-between gap-3 rounded-lg border border-primary/60 bg-surface-raised px-3.5 py-2 text-left text-sm text-ink transition hover:border-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label={label}
        >
          <SelectPrimitive.Value />
          <SelectPrimitive.Icon className="text-primary">
            <ChevronDownIcon />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            className="z-50 min-w-(--radix-select-trigger-width) overflow-hidden rounded-lg border border-line bg-surface-raised p-1 text-ink shadow-panel"
          >
            <SelectPrimitive.Viewport>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex cursor-pointer select-none items-center rounded-md py-2 pr-8 pl-3 text-sm outline-none data-highlighted:bg-primary/15 data-highlighted:text-primary-strong data-disabled:opacity-45"
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex text-primary">
                    <CheckIcon />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </label>
  );
}
