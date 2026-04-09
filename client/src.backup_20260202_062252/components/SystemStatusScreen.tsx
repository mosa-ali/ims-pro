import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SystemStatusScreenProps {
  title: string;
  message: string;
  showRetry?: boolean;
  onRetry?: () => void;
}

export function SystemStatusScreen({
  title,
  message,
  showRetry = true,
  onRetry,
}: SystemStatusScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-4">
            <AlertCircle className="h-12 w-12 text-amber-600 dark:text-amber-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
          {title}
        </h1>

        <p className="text-slate-600 dark:text-slate-400 mb-6">{message}</p>

        {showRetry && (
          <Button
            onClick={onRetry || (() => window.location.reload())}
            className="w-full"
            size="lg"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Connection
          </Button>
        )}

        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            If this issue persists, please contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

export function LoadingSpinner({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-lg">{message}</p>
      </div>
    </div>
  );
}
