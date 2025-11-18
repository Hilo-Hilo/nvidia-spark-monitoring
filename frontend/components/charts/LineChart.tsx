'use client';

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useMemo } from 'react';

interface LineChartProps {
  data: Array<Record<string, any>>;
  dataKey: string;
  xAxisKey?: string;
  lines?: Array<{ key: string; name: string; color?: string }>;
  height?: number;
  timezone?: string;
  yAxisFormatter?: (value: number) => string;
}

// Format timestamp in specified timezone
function formatTimestamp(value: string | number, timezone: string = 'UTC'): string {
  if (!value) return String(value);
  
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  
  try {
    return date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    // Fallback to UTC if timezone is invalid
    return date.toLocaleTimeString('en-US', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

// Format full date/time in specified timezone
function formatFullTimestamp(value: string | number, timezone: string = 'UTC'): string {
  if (!value) return String(value);
  
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  
  try {
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch (e) {
    // Fallback to UTC if timezone is invalid
    return date.toLocaleString('en-US', {
      timeZone: 'UTC',
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }
}

export function LineChart({ data, dataKey, xAxisKey = 'timestamp', lines, height = 300, timezone = 'UTC', yAxisFormatter }: LineChartProps) {
  const defaultLines = useMemo(() => lines || [{ key: dataKey, name: dataKey, color: '#8884d8' }], [lines, dataKey]);

  if (!data || data.length === 0) {
    return <div style={{ width: '100%', height }}>No data available</div>;
  }

  return (
    <div style={{ width: '100%', height }}>
      <RechartsLineChart data={data} width={800} height={height}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey={xAxisKey} 
          tickFormatter={(value) => {
            if (typeof value === 'string' && value.includes('T')) {
              return formatTimestamp(value, timezone);
            }
            return value;
          }}
        />
        <YAxis tickFormatter={yAxisFormatter ? (value) => yAxisFormatter(value) : undefined} />
        <Tooltip 
          labelFormatter={(value) => {
            if (typeof value === 'string' && value.includes('T')) {
              return formatFullTimestamp(value, timezone);
            }
            return value;
          }}
          formatter={(value: any) => {
            if (typeof value === 'number' && yAxisFormatter) {
              return yAxisFormatter(value);
            }
            return value;
          }}
        />
        <Legend />
        {defaultLines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            stroke={line.color || '#8884d8'}
            name={line.name}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
        ))}
      </RechartsLineChart>
    </div>
  );
}

