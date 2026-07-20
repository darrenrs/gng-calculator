import { NumberField } from "@base-ui/react/number-field";
import { useEffect, useState } from "react";

export type NumericInputProps = {
  id?: string;
  value: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function NumericInput({
  id,
  value,
  onValueChange,
  min,
  max,
  step = 1,
  integer = true,
  readOnly = false,
  disabled = false,
  className = "",
  "aria-label": ariaLabel,
}: NumericInputProps) {
  const [draftValue, setDraftValue] = useState<number | null>(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  function commit(nextValue: number | null, reason?: string) {
    if (nextValue === null || !Number.isFinite(nextValue)) {
      if (reason === "input-clear") {
        setDraftValue(null);
        return;
      }
      setDraftValue(value);
      return;
    }
    const rounded = integer ? Math.floor(nextValue) : nextValue;
    const normalized = Math.max(
      min ?? -Infinity,
      Math.min(max ?? Infinity, rounded),
    );
    setDraftValue(normalized);
    if (normalized !== value) onValueChange?.(normalized);
  }

  return (
    <NumberField.Root
      allowOutOfRange
      className="gng-number-field"
      disabled={disabled}
      id={id}
      max={max}
      min={min}
      readOnly={readOnly}
      step={step}
      value={draftValue}
      onValueChange={setDraftValue}
      onValueCommitted={(nextValue, eventDetails) =>
        commit(nextValue, eventDetails.reason)
      }
    >
      <NumberField.Input
        aria-label={ariaLabel}
        className={`gng-number-input ${className}`.trim()}
        onBlur={() => {
          if (draftValue === null) setDraftValue(value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit(draftValue, "enter");
            event.currentTarget.blur();
          }
        }}
      />
    </NumberField.Root>
  );
}
