import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export default function Input({
  label,
  error,
  id,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="uf-label block text-secondary">
        {label}
      </label>

      <input
        id={id}
        className={`uf-input ${className}`}
        {...props}
      />

      {error && (
        <p className="uf-caption text-error">
          {error}
        </p>
      )}
    </div>
  );
}