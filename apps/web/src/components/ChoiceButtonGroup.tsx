import { cn } from '../lib/cn';

interface ChoiceButtonGroupProps<T extends string | null> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function ChoiceButtonGroup<T extends string | null>({
  label,
  options,
  value,
  onChange,
  disabled,
}: ChoiceButtonGroupProps<T>) {
  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="text-sm font-medium text-gray-700">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'choice-btn',
              value === opt.value && 'choice-btn-selected',
            )}
            aria-pressed={value === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
