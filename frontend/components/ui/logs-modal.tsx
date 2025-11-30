'use client';

import { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';

interface LogsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  logs: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function LogsModal({
  open,
  onOpenChange,
  title,
  logs,
  isLoading = false,
  onRefresh,
}: LogsModalProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleDownload = () => {
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '-').toLowerCase()}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>{title}</span>
            <div className="flex gap-2">
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!logs}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Showing the last 100 log entries
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-zinc-950 rounded-md p-4 font-mono text-xs text-zinc-300 min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-zinc-500">
              Loading logs...
            </div>
          ) : logs ? (
            <>
              <pre className="whitespace-pre-wrap break-words">{logs}</pre>
              <div ref={logsEndRef} />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500">
              No logs available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

