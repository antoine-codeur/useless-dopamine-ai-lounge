import { PropsWithChildren, ReactNode } from "react";
import { HTMLMotionProps, motion } from "framer-motion";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import type { ButtonSizeId, ButtonVariantId } from "./control.entities";
export { buttonSizeEntities, buttonVariantEntities, controlStateEntities } from "./control.entities";
import "./Button.css";

type ButtonProps = PropsWithChildren<
  HTMLMotionProps<"button"> & {
    variant?: ButtonVariantId;
    size?: ButtonSizeId;
    loading?: boolean;
  }
>;

export function Button({ children, className, variant = "primary", size = "md", loading, disabled, ...props }: ButtonProps) {
  return (
    <motion.button
      className={clsx("button", `button--${variant}`, className)}
      aria-busy={loading || undefined}
      data-loading={loading ? "true" : undefined}
      data-size={size}
      disabled={disabled || loading}
      whileHover={disabled || loading ? undefined : { scale: 1.02 }}
      whileTap={disabled || loading ? undefined : { scale: 0.96 }}
      {...props}
    >
      <span className="button__content">{loading ? <span className="button__spinner" /> : children}</span>
    </motion.button>
  );
}

type IconButtonProps = Omit<ButtonProps, "children" | "size"> & {
  children: ReactNode;
  label: string;
  tooltip?: string;
  size?: Extract<ButtonSizeId, "sm" | "md" | "icon">;
};

export function IconButton({ children, label, tooltip = label, size = "icon", variant = "ghost", ...props }: IconButtonProps) {
  return (
    <Button aria-label={label} data-tooltip={tooltip} size={size === "icon" ? "icon" : size} variant={variant} {...props}>
      {children}
    </Button>
  );
}

type SelectControlProps<T extends string> = {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  getOptionLabel?: (value: T) => string;
  onChange: (value: T) => void;
  options: readonly T[];
  size?: Extract<ButtonSizeId, "sm" | "md">;
  value: T;
};

export function SelectControl<T extends string>({ ariaLabel, className, disabled, getOptionLabel, onChange, options, size = "md", value }: SelectControlProps<T>) {
  return (
    <label className={clsx("select-control", className)} data-size={size}>
      <span className="sr-only">{ariaLabel}</span>
      <select aria-label={ariaLabel} disabled={disabled} onChange={(event) => onChange(event.currentTarget.value as T)} value={value}>
        {options.map((option) => (
          <option key={option} value={option}>
            {getOptionLabel ? getOptionLabel(option) : option}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" size={15} />
    </label>
  );
}
