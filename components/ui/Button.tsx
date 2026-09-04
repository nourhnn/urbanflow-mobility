import Link from "next/link";

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary";
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
};

export default function Button({
  children,
  href,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
}: ButtonProps) {
  const baseStyles =
    "flex h-[52px] w-full items-center justify-center rounded-[16px] px-6 text-sm font-semibold transition-all duration-200 active:scale-[0.98]";

  const variants = {
    primary:
      "bg-primary text-white hover:bg-primary-hover shadow-[var(--shadow-sm)]",
    secondary:
      "border border-border bg-surface text-secondary hover:bg-secondary-soft",
  };

  const disabledStyles = disabled
    ? "cursor-not-allowed opacity-50 active:scale-100"
    : "";

  const styles = `${baseStyles} ${variants[variant]} ${disabledStyles} ${className}`;

  if (href) {
    return (
      <Link href={href} className={styles}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} className={styles}>
      {children}
    </button>
  );
}