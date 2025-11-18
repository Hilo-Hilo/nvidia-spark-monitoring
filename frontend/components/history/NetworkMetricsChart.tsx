'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoIcon } from '@/components/ui/info-icon';
import { LineChart } from '@/components/charts/LineChart';

type NetworkUnit = 'MB/s' | 'Mbps';

interface NetworkMetricsChartProps {
  data: Array<Record<string, any>>;
  loading?: boolean;
  timezone?: string;
  networkUnit?: NetworkUnit;
  onNetworkUnitChange?: (unit: NetworkUnit) => void;
}

// Format network rate
function formatNetworkRate(bytesPerSecond: number, unit: NetworkUnit = 'MB/s'): string {
  if (unit === 'Mbps') {
    const mbps = (bytesPerSecond * 8) / (1024 * 1024); // Convert bytes/s to Mbps
    if (mbps >= 1) {
      return `${mbps.toFixed(2)} Mbps`;
    } else {
      const kbps = (bytesPerSecond * 8) / 1024;
      return `${kbps.toFixed(2)} Kbps`;
    }
  } else {
    // MB/s
    const mbps = bytesPerSecond / (1024 * 1024); // Convert bytes/s to MB/s
    if (mbps >= 1) {
      return `${mbps.toFixed(2)} MB/s`;
    } else {
      const kbps = bytesPerSecond / 1024;
      return `${kbps.toFixed(2)} KB/s`;
    }
  }
}

export function NetworkMetricsChart({ data, loading, timezone = 'UTC', networkUnit = 'MB/s', onNetworkUnitChange }: NetworkMetricsChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Calculate rates from cumulative counters
    const rates: Array<{
      timestamp: string;
      'Sent Rate': number | null;
      'Received Rate': number | null;
      'Packets Sent': number | null;
      'Packets Received': number | null;
    }> = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const prevItem = i > 0 ? data[i - 1] : null;

      if (prevItem && item.network && prevItem.network) {
        const timeDiff = (new Date(item.timestamp).getTime() - new Date(prevItem.timestamp).getTime()) / 1000; // seconds
        
        if (timeDiff > 0 && timeDiff < 300) { // Only calculate if time difference is reasonable (avoid large gaps)
          const sentRateBytesPerSec = (item.network.bytes_sent - prevItem.network.bytes_sent) / timeDiff;
          const recvRateBytesPerSec = (item.network.bytes_recv - prevItem.network.bytes_recv) / timeDiff;
          
          // Convert to selected unit for display
          let sentRate: number;
          let recvRate: number;
          
          if (networkUnit === 'Mbps') {
            // Convert bytes/s to Mbps
            sentRate = (sentRateBytesPerSec * 8) / (1024 * 1024);
            recvRate = (recvRateBytesPerSec * 8) / (1024 * 1024);
          } else {
            // Convert bytes/s to MB/s
            sentRate = sentRateBytesPerSec / (1024 * 1024);
            recvRate = recvRateBytesPerSec / (1024 * 1024);
          }
          
          rates.push({
            timestamp: item.timestamp,
            'Sent Rate': Math.max(0, sentRate),
            'Received Rate': Math.max(0, recvRate),
            'Packets Sent': item.network.packets_sent ?? null,
            'Packets Received': item.network.packets_recv ?? null,
          });
        } else {
          // First data point or gap too large - show null
          rates.push({
            timestamp: item.timestamp,
            'Sent Rate': null,
            'Received Rate': null,
            'Packets Sent': item.network.packets_sent ?? null,
            'Packets Received': item.network.packets_recv ?? null,
          });
        }
      } else {
        // First data point
        rates.push({
          timestamp: item.timestamp,
          'Sent Rate': null,
          'Received Rate': null,
          'Packets Sent': item.network?.packets_sent ?? null,
          'Packets Received': item.network?.packets_recv ?? null,
        });
      }
    }

    return rates;
  }, [data, networkUnit]);

  // Don't hide chart while loading if we have previous data
  if (chartData.length === 0 && !loading) {
    return null;
  }

  // Format labels based on unit
  const sentLabel = networkUnit === 'Mbps' ? 'Sent Rate (Mbps)' : 'Sent Rate (MB/s)';
  const recvLabel = networkUnit === 'Mbps' ? 'Received Rate (Mbps)' : 'Received Rate (MB/s)';

  // Y-axis formatter that adapts units
  const yAxisFormatter = (value: number): string => {
    if (networkUnit === 'Mbps') {
      if (value >= 1) {
        return `${value.toFixed(1)} Mbps`;
      } else {
        const kbps = value * 1000; // 1 Mbps = 1000 Kbps
        return `${kbps.toFixed(0)} Kbps`;
      }
    } else {
      // MB/s
      if (value >= 1) {
        return `${value.toFixed(2)} MB/s`;
      } else {
        const kbps = value * 1024; // 1 MB/s = 1024 KB/s
        return `${kbps.toFixed(1)} KB/s`;
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Network I/O Metrics</CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={networkUnit}
              onChange={(e) => {
                const newUnit = e.target.value as NetworkUnit;
                if (onNetworkUnitChange) {
                  onNetworkUnitChange(newUnit);
                }
              }}
              className="px-2 py-1 text-xs border rounded bg-background"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="MB/s">MB/s</option>
              <option value="Mbps">Mbps</option>
            </select>
            <InfoIcon content="Network I/O shows the historical data transfer rate (bytes per second). Rates are calculated from cumulative counters and automatically adapt units (KB/s, MB/s, or Kbps, Mbps) based on the transfer speed. You can toggle between MB/s (megabytes per second) and Mbps (megabits per second) using the dropdown. The preference is shared with the dashboard and remembered across sessions." />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-2">
            Network Transfer Rate ({networkUnit === 'Mbps' ? 'Mbps' : 'MB/s'})
          </h3>
          <LineChart
            data={chartData}
            dataKey="Sent Rate"
            xAxisKey="timestamp"
            lines={[
              { key: 'Sent Rate', name: sentLabel, color: '#8884d8' },
              { key: 'Received Rate', name: recvLabel, color: '#82ca9d' },
            ]}
            height={250}
            timezone={timezone}
            yAxisFormatter={yAxisFormatter}
          />
        </div>
        <div>
          <h3 className="text-sm font-medium mb-2">Network Packets</h3>
          <LineChart
            data={chartData}
            dataKey="Packets Sent"
            xAxisKey="timestamp"
            lines={[
              { key: 'Packets Sent', name: 'Packets Sent', color: '#ffc658' },
              { key: 'Packets Received', name: 'Packets Received', color: '#ff7300' },
            ]}
            height={250}
            timezone={timezone}
          />
        </div>
      </CardContent>
    </Card>
  );
}

