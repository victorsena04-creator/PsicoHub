import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-petroleum-500 focus:border-transparent ${
            error ? "border-danger-500" : ""
          } ${className}`}
          {...props}
        />
        {error && <p className="text-sm text-danger-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";