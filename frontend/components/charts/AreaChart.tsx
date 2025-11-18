'use client';

import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface AreaChartProps {
  data: Array<Record<string, any>>;
  dataKey: string;
  xAxisKey?: string;
  name?: string;
  color?: string;
  height?: number;
  timezone?: string;
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

export function AreaChart({ data, dataKey, xAxisKey = 'timestamp', name, color = '#8884d8', height = 300, timezone = 'UTC' }: AreaChartProps) {
  if (!data || data.length === 0) {
    return <div style={{ width: '100%', height }}>No data available</div>;
  }

  return (
    <div style={{ width: '100%', height, overflow: 'auto' }}>
      <RechartsAreaChart data={data} width={800} height={height}>
        <defs>
          <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
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
        <YAxis />
        <Tooltip 
          labelFormatter={(value) => {
            if (typeof value === 'string' && value.includes('T')) {
              return formatFullTimestamp(value, timezone);
            }
            return value;
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          fill={`url(#color${dataKey})`}
          name={name || dataKey}
          connectNulls={false}
        />
      </RechartsAreaChart>
    </div>
  );
}

