import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[240px] w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-card/40 px-6 py-10 text-center">
      <div className="text-muted-foreground">
        {icon ?? <Inbox className="h-6 w-6" aria-hidden />}
      </div>
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      {description ? <p className="max-w-md text-xs text-muted-foreground">{description}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
