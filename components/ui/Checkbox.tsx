import type { InputHTMLAttributes } from "react";

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  label: React.ReactNode;
};

export default function Checkbox({
  label,
  id,
  ...props
}: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3"
    >
      <input
        id={id}
        type="checkbox"
        className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
        {...props}
      />

      <span className="uf-body text-muted">
        {label}
      </span>
    </label>
  );
}