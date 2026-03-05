import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ 
  title = "Error", 
  message, 
  onRetry 
}: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <div className="flex items-center gap-2 text-red-600">
        <AlertCircle className="h-6 w-6" />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-center text-muted-foreground">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">Retry</Button>
      )}
    </div>
  );
}
