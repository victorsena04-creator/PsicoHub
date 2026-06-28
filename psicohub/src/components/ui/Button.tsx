import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles = "font-medium rounded-lg transition-colors inline-flex items-center justify-center";
    
    const variants = {
      primary: "bg-petroleum-500 text-white hover:bg-petroleum-600",
      secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
      danger: "bg-danger-500 text-white hover:bg-danger-600",
      ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";