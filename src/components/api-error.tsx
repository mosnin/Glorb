"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApiErrorProps {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ApiError({ message, onRetry, compact }: ApiErrorProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{message}</span>
        {onRetry && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onRetry}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <AlertTriangle className="h-6 w-6 text-destructive" />
      <div className="text-center">
        <p className="text-sm font-medium">Failed to load</p>
        <p className="text-xs text-muted-foreground mt-1">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );
}
