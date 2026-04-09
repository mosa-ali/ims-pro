/**
 * BackButton — Central RTL-aware back navigation component
 * 
 * This component implements the global RTL navigation fix per Ali's directive.
 * It automatically flips the arrow direction based on the current language direction.
 * 
 * LTR (English): ← Back to Parent     (arrow on LEFT = start of LTR reading)
 * RTL (Arabic):  العودة إلى الأصل →   (arrow on RIGHT = start of RTL reading)
 * 
 * How it works:
 * - DOM order is always [ArrowIcon, Label] — never swapped
 * - The page has dir="rtl" in Arabic mode, which reverses flex child order automatically
 * - LTR: DOM [ArrowLeft, Text] → visual [←, Text] (arrow on left = start ✓)
 * - RTL: DOM [ArrowRight, Text] → browser reverses → visual [Text, →] (arrow on right = start ✓)
 * 
 * IMPORTANT: Do NOT add flex-row-reverse or swap DOM order for RTL.
 * The browser's native dir="rtl" on the flex container already handles the reversal.
 * Adding flex-row-reverse would cause a DOUBLE reversal, putting the arrow on the wrong side.
 * 
 * Usage:
 * <BackButton href="/organization/finance" label="Back to Finance" />
 * <BackButton onClick={() => navigate(-1)} label="رجوع" />
 */

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

interface BackButtonProps {
  /** Navigation target URL. If provided, renders as a Link. */
  href?: string;
  /** Click handler. Used when href is not provided. */
  onClick?: () => void;
  /** The label text (e.g., "Back to Finance" or "العودة إلى المالية") */
  label?: string;
  /** Button variant — defaults to "ghost" */
  variant?: "ghost" | "outline" | "default" | "secondary" | "destructive" | "link";
  /** Button size — defaults to "sm" */
  size?: "sm" | "default" | "lg" | "icon";
  /** Additional CSS classes */
  className?: string;
  /** Whether to show only the icon (no label text) */
  iconOnly?: boolean;
}

export function BackButton({
  href,
  onClick,
  label,
  variant = "ghost",
  size = "sm",
  className = "",
  iconOnly = false,
}: BackButtonProps) {
  const { isRTL } = useLanguage();

  // Arrow direction: ArrowRight for RTL (→ = "back" in RTL), ArrowLeft for LTR (← = "back" in LTR)
  const ArrowIcon = isRTL ? ArrowRight : ArrowLeft;

  // DOM order is ALWAYS [Arrow, Text] — never swap for RTL!
  // The browser's dir="rtl" on the page automatically reverses flex children,
  // so [Arrow, Text] in DOM becomes [Text, Arrow] visually in RTL = arrow on right (start) ✓
  const buttonContent = (
    <span className="inline-flex items-center gap-2">
      <ArrowIcon className="h-4 w-4 shrink-0" />
      {!iconOnly && label && <span>{label}</span>}
    </span>
  );

  if (href) {
    return (
      <Link href={href}>
        <Button
          variant={variant}
          size={iconOnly ? "icon" : size}
          className={className}
        >
          {buttonContent}
        </Button>
      </Link>
    );
  }

  return (
    <Button
      variant={variant}
      size={iconOnly ? "icon" : size}
      className={className}
      onClick={onClick}
    >
      {buttonContent}
    </Button>
  );
}

export default BackButton;
