import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  // Detect RTL from document direction
  const isRTL = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ 
          transform: isRTL 
            ? `translateX(${100 - (value || 0)}%)` // RTL: fill from right to left
            : `translateX(-${100 - (value || 0)}%)` // LTR: fill from left to right
        }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
