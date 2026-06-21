import type { CSSProperties, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonAccent = "violet" | "mint";

interface ButtonProps {
  variant: ButtonVariant;
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  /** Only affects `variant="primary"`. Defaults to violet. */
  accent?: ButtonAccent;
  className?: string;
}

const VARIANT_STYLE: Record<ButtonVariant, CSSProperties> = {
  primary: {
    height: 52,
    padding: "0 26px",
    border: "none",
    background: "linear-gradient(95deg, #8b6dff, #a06bff)",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: 15,
    boxShadow: "0 10px 30px rgba(139,109,255,0.30)",
  },
  secondary: {
    height: 52,
    padding: "0 24px",
    border: "1px solid rgba(139,109,255,0.50)",
    background: "rgba(139,109,255,0.12)",
    color: "#c4b5ff",
    fontWeight: 600,
    fontSize: 15,
  },
  ghost: {
    height: 48,
    padding: "0 22px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#c7c7d1",
    fontWeight: 500,
    fontSize: 14,
  },
};

const MINT_PRIMARY: CSSProperties = {
  background: "linear-gradient(95deg, #4fe3c1, #48b3ff)",
  color: "#072019",
};

const HOVER_CLASS: Record<ButtonVariant, string> = {
  primary: "hover:brightness-110",
  secondary: "hover:bg-[rgba(139,109,255,0.22)]",
  ghost: "hover:bg-[rgba(255,255,255,0.08)] hover:text-white",
};

export function Button({
  variant,
  icon,
  children,
  onClick,
  href,
  disabled,
  accent = "violet",
  className = "",
}: ButtonProps) {
  const style: CSSProperties = {
    ...VARIANT_STYLE[variant],
    borderRadius: 13,
    ...(variant === "primary" && accent === "mint" ? MINT_PRIMARY : null),
  };

  const sharedClassName = `font-display inline-flex items-center gap-[9px] cursor-pointer transition-[filter,background-color,color] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 ${HOVER_CLASS[variant]} ${className}`;

  const content = (
    <>
      {icon}
      {children}
    </>
  );

  if (href) {
    return (
      <a href={href} style={style} className={sharedClassName}>
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={sharedClassName}
    >
      {content}
    </button>
  );
}
