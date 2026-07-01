import React from 'react';

/**
 * Utility to merge tailwind classes
 */
function cn(...classes: (string | undefined | boolean | null)[]) {
  return classes.filter(Boolean).join(' ');
}

/**
 * IconButton Component Props
 */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Material icon name (e.g., "settings", "notifications") */
  icon: string;
  /** Visual style variant from the Executive Financial design system */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'tonal' | 'text';
  /** Button sizing scale */
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

/**
 * IconButton Component
 * A robust, strictly-typed interactive component aligned with the 
 * Executive Financial Intelligence (#003461) design system.
 * 
 * Path: client/src/components/ui/IconButton.tsx
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (props, ref) => {
    const { 
      icon, 
      variant = 'ghost', 
      size = 'md', 
      className, 
      ...rest 
    } = props;

    // Size mapping for button containers
    const sizeClasses: Record<'xs' | 'sm' | 'md' | 'lg', string> = {
      xs: 'p-1 h-6 w-6 min-h-[24px] min-w-[24px]',
      sm: 'p-1.5 h-8 w-8 min-h-[32px] min-w-[32px]',
      md: 'p-2 h-10 w-10 min-h-[40px] min-w-[40px]',
      lg: 'p-3 h-12 w-12 min-h-[48px] min-w-[48px]',
    };

    // Sizing for the material-icon font
    const iconSizeClasses: Record<'xs' | 'sm' | 'md' | 'lg', string> = {
      xs: 'text-[16px]',
      sm: 'text-[20px]',
      md: 'text-[24px]',
      lg: 'text-[28px]',
    };

    // Style variants using Design System 1 color tokens
    const variantClasses: Record<'primary' | 'secondary' | 'outline' | 'ghost' | 'tonal' | 'text', string> = {
      primary: 'bg-[#003461] text-white hover:bg-[#002a4d] shadow-sm active:bg-[#001f3a]',
      secondary: 'bg-secondary text-on-secondary hover:bg-secondary/90',
      outline: 'border border-border-subtle bg-transparent hover:bg-surface-container-low text-on-surface',
      ghost: 'bg-transparent hover:bg-surface-container-low text-on-surface-variant',
      tonal: 'bg-[#003461]/10 text-[#003461] hover:bg-[#003461]/20',
      text: 'bg-transparent text-[#003461] hover:bg-[#003461]/5',
    };

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'inline-flex items-center justify-center rounded-lg transition-all duration-200',
          'active:scale-95 disabled:opacity-40 disabled:pointer-events-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003461] focus-visible:ring-offset-2',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...rest}
      >
        <span className={cn('material-icons select-none', iconSizeClasses[size])}>
          {icon}
        </span>
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
