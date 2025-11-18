'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart } from '@/components/charts/LineChart';
import { SystemMetrics } from '@/lib/api';
import { useEffect, useState } from 'react';

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function formatRate(bytesPerSecond: number): string {
  const mbps = bytesPerSecond / (1024 * 1024);
  if (mbps >= 1) {
    return `${mbps.toFixed(2)} MB/s`;
  } else {
    const kbps = bytesPerSecond / 1024;
    return `${kbps.toFixed(2)} KB/s`;
  }
}

interface NetworkMetricsProps {
  metrics: SystemMetrics | null;
}

export function NetworkMetrics({ metrics }: NetworkMetricsProps) {
  const [history, setHistory] = useState<Array<{ timestamp: string; bytes_sent: number; bytes_recv: number }>>([]);
  const [prevBytes, setPrevBytes] = useState<{ sent: number; recv: number } | null>(null);

  useEffect(() => {
    if (metrics) {
      const current = { sent: metrics.network.bytes_sent, recv: metrics.network.bytes_recv };
      
      if (prevBytes) {
        const sentDiff = metrics.network.bytes_sent - prevBytes.sent;
        const recvDiff = metrics.network.bytes_recv - prevBytes.recv;
        
        setHistory((prev) => {
          const newHistory = [...prev, {
            timestamp: metrics.timestamp,
            bytes_sent: sentDiff,
            bytes_recv: recvDiff
          }];
          return newHistory.slice(-60);
        });
      }
      
      setPrevBytes(current);
    }
  }, [metrics, prevBytes]);

  if (!metrics) {
    return <Card><CardContent className="p-6">Loading network metrics...</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Network I/O</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Total Bytes Sent</div>
              <div className="text-2xl font-bold">{formatBytes(metrics.network.bytes_sent)}</div>
              <div className="text-xs text-muted-foreground">
                Rate: {formatRate(metrics.network.bytes_sent_rate)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Total Bytes Received</div>
              <div className="text-2xl font-bold">{formatBytes(metrics.network.bytes_recv)}</div>
              <div className="text-xs text-muted-foreground">
                Rate: {formatRate(metrics.network.bytes_recv_rate)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Packets Sent</div>
              <div className="text-2xl font-bold">{metrics.network.packets_sent.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                Rate: {metrics.network.packets_sent_rate.toFixed(1)} packets/s
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Packets Received</div>
              <div className="text-2xl font-bold">{metrics.network.packets_recv.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                Rate: {metrics.network.packets_recv_rate.toFixed(1)} packets/s
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Network I/O Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={history}
              dataKey="bytes_sent"
              xAxisKey="timestamp"
              lines={[
                { key: 'bytes_sent', name: 'Bytes Sent', color: '#3b82f6' },
                { key: 'bytes_recv', name: 'Bytes Received', color: '#10b981' }
              ]}
              height={200}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

