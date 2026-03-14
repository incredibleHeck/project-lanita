import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  className?: string
  variant?: "default" | "table"
}

function EmptyState({
  icon,
  title,
  description,
  className,
  variant = "default",
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-4 text-center",
        variant === "table" ? "py-12" : "min-h-[200px]",
        className
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <span className="text-muted-foreground/60 [&>svg]:size-10 [&>svg]:shrink-0">
          {icon}
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

export { EmptyState }
