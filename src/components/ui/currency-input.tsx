import * as React from "react";
import { cn } from "@/lib/utils";
import { parseBRL, numberToBRLInput } from "@/lib/currency";

interface CurrencyInputProps {
  value: string;
  onValueChange: (raw: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, placeholder = "Ex: 100.000,00", className, disabled }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(value);
    const [focused, setFocused] = React.useState(false);

    // Sync external value changes
    React.useEffect(() => {
      if (!focused) {
        setDisplayValue(value);
      }
    }, [value, focused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Allow digits, dots, commas, spaces
      setDisplayValue(raw);
      onValueChange(raw);
    };

    const handleBlur = () => {
      setFocused(false);
      const num = parseBRL(displayValue);
      if (num > 0) {
        const formatted = numberToBRLInput(num);
        setDisplayValue(formatted);
        onValueChange(formatted);
      } else if (displayValue.trim() === "") {
        setDisplayValue("");
        onValueChange("");
      }
    };

    const handleFocus = () => {
      setFocused(true);
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          R$
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
