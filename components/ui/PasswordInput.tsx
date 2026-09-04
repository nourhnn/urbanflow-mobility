"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type PasswordInputProps = {
  label: string;
  id: string;
  name?: string;
  placeholder?: string;
  autoComplete?: string;
};

export default function PasswordInput({
  label,
  id,
  name,
  placeholder,
  autoComplete,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="uf-label block text-secondary">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="uf-input pr-12"
        />

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-secondary"
          aria-label={
            visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
          }
        >
          {visible ? (
            <EyeOff size={19} strokeWidth={2} />
          ) : (
            <Eye size={19} strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  );
}