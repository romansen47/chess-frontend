import { useEffect, useId, useState } from "react";

interface EditablePresetNumberInputProps {
  value: number;
  presets: number[];
  suffix?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

function positiveInteger(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

export default function EditablePresetNumberInput({
  value,
  presets,
  suffix,
  disabled = false,
  onChange,
}: EditablePresetNumberInputProps) {
  const presetListId = useId();
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const resetInvalidDraft = () => {
    if (positiveInteger(draft) === null) {
      setDraft(String(value));
    }
  };

  return (
    <>
      <input
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        list={presetListId}
        value={draft}
        disabled={disabled}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);
          const parsed = positiveInteger(nextDraft);
          if (parsed !== null) onChange(parsed);
        }}
        onBlur={resetInvalidDraft}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      <datalist id={presetListId}>
        {presets.map((preset) => (
          <option
            key={preset}
            value={preset}
            label={suffix ? `${preset} ${suffix}` : String(preset)}
          />
        ))}
      </datalist>
    </>
  );
}
