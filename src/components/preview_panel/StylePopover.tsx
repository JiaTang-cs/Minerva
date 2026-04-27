import { ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface StylePopoverProps {
  icon: ReactNode;
  title: string;
  tooltip: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

export function StylePopover({
  icon,
  title,
  tooltip,
  children,
  side = "bottom",
}: StylePopoverProps) {
  return (
    <Popover>
      <PopoverTrigger
        className="p-1 rounded-md transition-colors hover:bg-primary/10 dark:hover:bg-primary/20 text-muted-foreground hover:text-primary dark:hover:text-primary"
        aria-label={tooltip}
        title={tooltip}
      >
        {icon}
      </PopoverTrigger>
      <PopoverContent side={side} className="w-64">
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-foreground">
            {title}
          </h4>
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}
