'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GaugeChart } from '@/components/charts/GaugeChart';
import { LineChart } from '@/components/charts/LineChart';
import { useMetrics } from '@/hooks/useMetrics';
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

export function GPUMetrics() {
  const { metrics } = useMetrics();
  const [history, setHistory] = useState<Array<{ timestamp: string; [key: string]: any }>>([]);

  useEffect(() => {
    if (metrics && metrics.gpus.length > 0) {
      const gpuData: { timestamp: string; [key: string]: any } = { timestamp: metrics.timestamp };
      metrics.gpus.forEach((gpu) => {
        gpuData[`gpu${gpu.index}_utilization`] = gpu.utilization;
        gpuData[`gpu${gpu.index}_memory`] = gpu.memory_percent;
        gpuData[`gpu${gpu.index}_temp`] = gpu.temperature;
      });
      
      setHistory((prev) => {
        const newHistory = [...prev, gpuData];
        return newHistory.slice(-60);
      });
    }
  }, [metrics]);

  if (!metrics) {
    return <Card><CardContent className="p-6">Loading GPU metrics...</CardContent></Card>;
  }

  if (metrics.gpus.length === 0) {
    return <Card><CardContent className="p-6">No GPU detected</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {metrics.gpus.map((gpu) => (
        <Card key={gpu.index}>
          <CardHeader>
            <CardTitle>GPU {gpu.index}: {gpu.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <GaugeChart
                value={gpu.utilization}
                max={100}
                label="GPU Utilization"
                unit="%"
                color="#8b5cf6"
              />
              <GaugeChart
                value={gpu.memory_percent}
                max={100}
                label="Memory Usage"
                unit="%"
                color="#ec4899"
              />
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Temperature: </span>
                  <span className="font-medium">{gpu.temperature}°C</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Memory Used: </span>
                  <span className="font-medium">{formatBytes(gpu.memory_used)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Memory Total: </span>
                  <span className="font-medium">{formatBytes(gpu.memory_total)}</span>
                </div>
                {gpu.power_draw && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Power Draw: </span>
                    <span className="font-medium">{gpu.power_draw.toFixed(1)} W</span>
                  </div>
                )}
              </div>
            </div>
            
            {history.length > 0 && (
              <div className="mt-4">
                <LineChart
                  data={history}
                  dataKey={`gpu${gpu.index}_utilization`}
                  xAxisKey="timestamp"
                  lines={[
                    { key: `gpu${gpu.index}_utilization`, name: 'Utilization (%)', color: '#8b5cf6' },
                    { key: `gpu${gpu.index}_memory`, name: 'Memory (%)', color: '#ec4899' },
                    { key: `gpu${gpu.index}_temp`, name: 'Temperature (°C)', color: '#f59e0b' }
                  ]}
                  height={200}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

