'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { subHours, subDays, subWeeks, subMonths, format } from 'date-fns';

interface DateRangePickerProps {
  startTime: Date;
  endTime: Date;
  onRangeChange: (start: Date, end: Date) => void;
  timezone?: string;
}

/**
 * Convert a UTC Date to a string in the format required by datetime-local input
 * The datetime-local input expects a string in local timezone format, but we need to
 * display the UTC time in the input field correctly.
 */
function formatUTCForInput(date: Date): string {
  // Get UTC components
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Parse a datetime-local input value as UTC
 * The input gives us a string that represents a local time, but we treat it as UTC
 */
function parseInputAsUTC(value: string): Date {
  // Parse the input string (which is in YYYY-MM-DDTHH:mm format)
  // Treat it as UTC time
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  // Create a Date object in UTC
  return new Date(Date.UTC(year, month - 1, day, hours, minutes));
}

// Format date for display in timezone
function formatDateForDisplay(date: Date, timezone: string): string {
  if (timezone === 'UTC') {
    return format(date, 'PPpp') + ' UTC';
  }
  
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      dateStyle: 'full',
      timeStyle: 'short',
      timeZoneName: 'short',
    });
    return formatter.format(date);
  } catch (e) {
    return format(date, 'PPpp') + ' UTC';
  }
}

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
 * Subtract hours from a UTC date
 */
function subHoursUTC(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setUTCHours(result.getUTCHours() - hours);
  return result;
}

/**
 * Subtract days from a UTC date
 */
function subDaysUTC(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() - days);
  return result;
}

/**
 * Subtract weeks from a UTC date
 */
function subWeeksUTC(date: Date, weeks: number): Date {
  return subDaysUTC(date, weeks * 7);
}

/**
 * Subtract months from a UTC date
 */
function subMonthsUTC(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() - months);
  return result;
}

export function DateRangePicker({ startTime, endTime, onRangeChange, timezone = 'UTC' }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(false);

  const presets = [
    { label: 'Last Hour', getRange: () => ({ start: subHoursUTC(getCurrentUTC(), 1), end: getCurrentUTC() }) },
    { label: 'Last 24 Hours', getRange: () => ({ start: subDaysUTC(getCurrentUTC(), 1), end: getCurrentUTC() }) },
    { label: 'Last Week', getRange: () => ({ start: subWeeksUTC(getCurrentUTC(), 1), end: getCurrentUTC() }) },
    { label: 'Last Month', getRange: () => ({ start: subMonthsUTC(getCurrentUTC(), 1), end: getCurrentUTC() }) },
  ];

  const handlePreset = (preset: typeof presets[0]) => {
    const { start, end } = preset.getRange();
    onRangeChange(start, end);
    setShowCustom(false);
  };

  const handleCustomStart = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Parse the input value as UTC
    const newStart = parseInputAsUTC(e.target.value);
    if (!isNaN(newStart.getTime())) {
      onRangeChange(newStart, endTime);
    }
  };

  const handleCustomEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Parse the input value as UTC
    const newEnd = parseInputAsUTC(e.target.value);
    if (!isNaN(newEnd.getTime())) {
      onRangeChange(startTime, newEnd);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time Range</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => handlePreset(preset)}
            >
              {preset.label}
            </Button>
          ))}
          <Button
            variant={showCustom ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowCustom(!showCustom)}
          >
            Custom Range
          </Button>
        </div>

        {showCustom && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium mb-2">Start Time (UTC)</label>
              <input
                type="datetime-local"
                value={formatUTCForInput(startTime)}
                onChange={handleCustomStart}
                className="w-full px-3 py-2 border rounded-md"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formatDateForDisplay(startTime, timezone)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Time (UTC)</label>
              <input
                type="datetime-local"
                value={formatUTCForInput(endTime)}
                onChange={handleCustomEnd}
                className="w-full px-3 py-2 border rounded-md"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formatDateForDisplay(endTime, timezone)}
              </p>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          Showing data from {formatDateForDisplay(startTime, timezone)} to {formatDateForDisplay(endTime, timezone)}
        </div>
      </CardContent>
    </Card>
  );
}

