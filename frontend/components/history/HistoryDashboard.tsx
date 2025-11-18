'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useHistoricalData } from '@/hooks/useHistoricalData';
import { DateRangePicker } from './DateRangePicker';
import { CPUMetricsChart } from './CPUMetricsChart';
import { MemoryMetricsChart } from './MemoryMetricsChart';
import { DiskMetricsChart } from './DiskMetricsChart';
import { NetworkMetricsChart } from './NetworkMetricsChart';
import { GPUMetricsChart } from './GPUMetricsChart';
import { preferences, type NetworkUnit } from '@/lib/preferences';

// Common timezones
const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
];

/**
 * Get current time as UTC Date
 */
function getCurrentUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds()
  ));
}

/**
 * Subtract days from a UTC date
 */
function subDaysUTC(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() - days);
  return result;
}

export function HistoryDashboard() {
  const [startTime, setStartTime] = useState(() => subDaysUTC(getCurrentUTC(), 1));
  const [endTime, setEndTime] = useState(() => getCurrentUTC());
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timezone, setTimezone] = useState<string>(() => {
    return preferences.getTimezone();
  });
  const [networkUnit, setNetworkUnit] = useState<NetworkUnit>(() => {
    return preferences.getNetworkUnit();
  });
  const { fetchHistoricalMetrics, loading, error } = useHistoricalData();

  // Initialize timezone on mount - ensure stored preference is loaded
  useEffect(() => {
    const storedTimezone = preferences.getTimezone();
    if (storedTimezone && storedTimezone !== timezone) {
      setTimezone(storedTimezone);
    }
  }, []); // Only run on mount

  // Save timezone preference when it changes
  useEffect(() => {
    preferences.setTimezone(timezone);
  }, [timezone]);

  // Save network unit preference
  useEffect(() => {
    preferences.setNetworkUnit(networkUnit);
  }, [networkUnit]);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        const response = await fetchHistoricalMetrics(startTime, endTime);
        if (isMounted) {
          if (response && response.metrics) {
            // Data is already in chronological order (oldest to newest) from API
            setHistoricalData(response.metrics);
          } else {
            setHistoricalData([]);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load historical data:', err);
          // Don't clear data on error, keep showing previous data
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [startTime, endTime]); // Removed fetchHistoricalMetrics from deps

  const handleRangeChange = (start: Date, end: Date) => {
    setStartTime(start);
    setEndTime(end);
  };

  if (isLoading && historicalData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <DateRangePicker
            startTime={startTime}
            endTime={endTime}
            onRangeChange={handleRangeChange}
            timezone={timezone}
          />
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <label htmlFor="timezone-select" className="text-sm font-medium">
                  Timezone:
                </label>
                <select
                  id="timezone-select"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="px-3 py-1.5 text-sm border rounded-md bg-background"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="text-center py-12">
          <p className="text-lg">Loading historical data...</p>
        </div>
      </div>
    );
  }

  if (error && historicalData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <DateRangePicker
            startTime={startTime}
            endTime={endTime}
            onRangeChange={handleRangeChange}
            timezone={timezone}
          />
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <label htmlFor="timezone-select" className="text-sm font-medium">
                  Timezone:
                </label>
                <select
                  id="timezone-select"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="px-3 py-1.5 text-sm border rounded-md bg-background"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="text-center py-12">
          <p className="text-lg text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <DateRangePicker
          startTime={startTime}
          endTime={endTime}
          onRangeChange={handleRangeChange}
          timezone={timezone}
        />
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <label htmlFor="timezone-select" className="text-sm font-medium">
                Timezone:
              </label>
              <select
                id="timezone-select"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-md bg-background"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Loading new data...
        </div>
      )}

      <CPUMetricsChart data={historicalData} loading={isLoading} timezone={timezone} />
      <MemoryMetricsChart data={historicalData} loading={isLoading} timezone={timezone} />
      <DiskMetricsChart data={historicalData} loading={isLoading} timezone={timezone} />
      <NetworkMetricsChart 
        data={historicalData} 
        loading={isLoading} 
        timezone={timezone} 
        networkUnit={networkUnit}
        onNetworkUnitChange={setNetworkUnit}
      />
      <GPUMetricsChart data={historicalData} loading={isLoading} timezone={timezone} />
    </div>
  );
}

