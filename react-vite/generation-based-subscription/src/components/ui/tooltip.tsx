import * as React from 'react';
import { cn } from '../../lib/utils';

interface TooltipContextValue {
  delayDuration?: number;
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

const TooltipContext = React.createContext<TooltipContextValue>({});

interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
}

function TooltipProvider({ children, delayDuration = 200 }: TooltipProviderProps) {
  return (
    <TooltipContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipContext.Provider>
  );
}

interface TooltipProps {
  children: React.ReactNode;
}

function Tooltip({ children }: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const existingContext = React.useContext(TooltipContext);
  
  return (
    <TooltipContext.Provider value={{ ...existingContext, open, setOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </TooltipContext.Provider>
  );
}

interface TooltipTriggerProps extends React.HTMLAttributes<HTMLSpanElement> {
  asChild?: boolean;
  children: React.ReactNode;
}

const TooltipTrigger = React.forwardRef<HTMLSpanElement, TooltipTriggerProps>(
  ({ asChild, children, ...props }, ref) => {
  const { setOpen } = React.useContext(TooltipContext);
  
  const handleMouseEnter = () => setOpen?.(true);
  const handleMouseLeave = () => setOpen?.(false);
  
  if (asChild && React.isValidElement(children)) {
    // Clone element without passing ref to avoid ref access during render
    // The child component should handle its own ref if needed
    return React.cloneElement(children, {
      ...props,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    } as Partial<React.HTMLAttributes<HTMLElement>>);
  }
  
  return (
    <span
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </span>
  );
});
TooltipTrigger.displayName = 'TooltipTrigger';

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, children, ...props }, ref) => {
  const { open } = React.useContext(TooltipContext);
  
  if (!open) return null;
  
  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 max-w-xs',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };


