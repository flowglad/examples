import * as React from 'react';
import { cn } from '../../lib/utils';

const Progress = React.forwardRef(({ className, value, ...props }, ref) => {
  const clampedValue = Math.max(0, Math.min(100, value || 0));
  
  return (
    <div
      ref={ref}
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
        className
      )}
      {...props}
    >
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
});
Progress.displayName = 'Progress';

export { Progress };


