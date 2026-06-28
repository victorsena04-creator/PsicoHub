import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", title, subtitle, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}
        {...props}
      >
        {(title || subtitle) && (
          <div className="p-4 border-b border-gray-100">
            {title && <h3 className="font-semibold text-gray-800">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    );
  }
);

Card.displayName = "Card";