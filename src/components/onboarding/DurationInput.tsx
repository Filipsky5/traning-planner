import { Input } from "@/components/ui/input";

export interface DurationState {
  hours: string;
  minutes: string;
  seconds: string;
}

interface DurationInputProps {
  value: DurationState;
  onChange: (value: DurationState) => void;
  disabled: boolean;
}

/**
 * Custom input component for entering workout duration in HH:MM:SS format
 * Provides three separate fields for hours, minutes, and seconds
 */
export function DurationInput({ value, onChange, disabled }: DurationInputProps) {
  const handleChange = (field: keyof DurationState, newValue: string) => {
    onChange({
      ...value,
      [field]: newValue,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <Input
          type="number"
          min="0"
          max="23"
          value={value.hours}
          onChange={(e) => handleChange("hours", e.target.value)}
          disabled={disabled}
          placeholder="GG"
          className="text-center"
          data-testid="duration-hours-input"
        />
        <p className="text-xs text-gray-500 text-center mt-1">godziny</p>
      </div>

      <span className="text-2xl text-gray-400 pb-5">:</span>

      <div className="flex-1">
        <Input
          type="number"
          min="0"
          max="59"
          value={value.minutes}
          onChange={(e) => handleChange("minutes", e.target.value)}
          disabled={disabled}
          placeholder="MM"
          className="text-center"
          data-testid="duration-minutes-input"
        />
        <p className="text-xs text-gray-500 text-center mt-1">minuty</p>
      </div>

      <span className="text-2xl text-gray-400 pb-5">:</span>

      <div className="flex-1">
        <Input
          type="number"
          min="0"
          max="59"
          value={value.seconds}
          onChange={(e) => handleChange("seconds", e.target.value)}
          disabled={disabled}
          placeholder="SS"
          className="text-center"
          data-testid="duration-seconds-input"
        />
        <p className="text-xs text-gray-500 text-center mt-1">sekundy</p>
      </div>
    </div>
  );
}
