import type { ReactNode } from "react";
import "./NumericStepper.css";

interface NumericStepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  prefix?: string;
  hint?: ReactNode;
  disabled?: boolean;
  editable?: boolean;
  active?: boolean;
  variant?: "flat" | "card";
  className?: string;
}

function clamp(value: number, min: number | undefined, max: number | undefined): number {
  const withMin = min == null ? value : Math.max(min, value);
  return max == null ? withMin : Math.min(max, withMin);
}

export default function NumericStepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  prefix,
  hint,
  disabled = false,
  editable = false,
  active = false,
  variant = "flat",
  className = "",
}: NumericStepperProps) {
  const applyValue = (nextValue: number) => {
    if (!Number.isFinite(nextValue)) return;
    onChange(clamp(Math.trunc(nextValue), min, max));
  };

  const atMin = min != null && value <= min;
  const atMax = max != null && value >= max;

  return (
    <div
      className={[
        "numeric-stepper",
        `numeric-stepper-${variant}`,
        active ? "numeric-stepper-active" : "",
        className,
      ].filter(Boolean).join(" ")}
    >
      <span className="numeric-stepper-label">{label}</span>

      <div className="numeric-stepper-value">
        {prefix && <span className="numeric-stepper-prefix">{prefix}</span>}
        {editable ? (
          <input
            className="numeric-stepper-input"
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={step}
            value={value}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => {
              const nextValue = event.currentTarget.valueAsNumber;
              if (Number.isFinite(nextValue)) applyValue(nextValue);
            }}
            disabled={disabled}
            aria-label={label}
          />
        ) : (
          <strong>{value}</strong>
        )}
        {unit && <span className="numeric-stepper-unit">{unit}</span>}
      </div>

      <div className="numeric-stepper-buttons">
        <button
          type="button"
          onClick={() => applyValue(value + step)}
          disabled={disabled || atMax}
          aria-label={`${label} +${step}`}
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => applyValue(value - step)}
          disabled={disabled || atMin}
          aria-label={`${label} -${step}`}
        >
          ▼
        </button>
      </div>

      {hint && <span className="numeric-stepper-hint">{hint}</span>}
    </div>
  );
}
