'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { InfoIcon } from '@/components/ui/info-icon';
import { api, ProcessInfo } from '@/lib/api';
import { auth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export function ProcessList() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const router = useRouter();

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }

    const fetchProcesses = async () => {
      try {
        const response = await api.processes.getAll();
        setProcesses(response.data.processes);
        setError(null);
      } catch (err: any) {
        if (err.response?.status === 401) {
          router.push('/login');
        } else {
          setError(err.response?.data?.detail || 'Failed to fetch processes');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProcesses();
    
    if (!isPaused) {
      const interval = setInterval(fetchProcesses, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [router, isPaused]);

  const handleKillProcess = async (pid: number) => {
    if (!confirm(`Are you sure you want to kill process ${pid}?`)) {
      return;
    }

    try {
      await api.processes.kill(pid);
      // Refresh process list
      const response = await api.processes.getAll();
      setProcesses(response.data.processes);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to kill process');
    }
  };

  const handleSetPriority = async (pid: number, priority: number) => {
    try {
      await api.processes.setPriority(pid, priority);
      // Refresh process list
      const response = await api.processes.getAll();
      setProcesses(response.data.processes);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to set priority');
    }
  };

  // Filter processes based on search term and filter type
  const filteredProcesses = useMemo(() => {
    let filtered = [...processes];

    // Apply filter type
    switch (filterType) {
      case 'high-cpu':
        filtered = filtered.filter(p => p.cpu_percent > 1.0);
        break;
      case 'high-memory':
        filtered = filtered.filter(p => p.memory_percent > 1.0);
        break;
      case 'running':
        filtered = filtered.filter(p => p.status === 'running');
        break;
      case 'sleeping':
        filtered = filtered.filter(p => p.status === 'sleeping');
        break;
      default:
        // 'all' - no filter
        break;
    }

    // Apply search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(proc => 
        proc.name.toLowerCase().includes(search) ||
        proc.username.toLowerCase().includes(search) ||
        proc.pid.toString().includes(search) ||
        proc.status.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [processes, searchTerm, filterType]);

  if (loading) {
    return <Card><CardContent className="p-6">Loading processes...</CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="p-6 text-destructive">{error}</CardContent></Card>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>
                Running Processes ({filteredProcesses.length} / {processes.length})
              </CardTitle>
              <InfoIcon title="Running Processes" content="This table shows all running processes on the system. CPU % represents the percentage of a single CPU core being used by this process (can exceed 100% on multi-core systems if using multiple cores). Memory % shows the percentage of total system RAM used by this process. Status indicates whether the process is actively running or sleeping/waiting. You can search, filter, and manage processes from this interface." />
            </div>
            <Button
              variant={isPaused ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-4">
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by name, user, PID, or status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">All Processes</option>
                  <option value="high-cpu">High CPU (&gt;1%)</option>
                  <option value="high-memory">High Memory (&gt;1%)</option>
                  <option value="running">Running</option>
                  <option value="sleeping">Sleeping</option>
                </select>
              </div>
            </div>
            {isPaused && (
              <div className="text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                ⚠️ Auto-refresh is paused. Click "Resume" to continue updating.
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      CPU %
                      <InfoIcon title="CPU %" content="CPU usage percentage for this process. On multi-core systems, this can exceed 100% if the process uses multiple cores. For example, 200% means the process is using 2 CPU cores at 100% each." className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Memory %
                      <InfoIcon title="Memory %" content="Memory usage percentage shows how much of the total system RAM this process is using. This is calculated as (process memory / total system memory) × 100%." className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcesses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No processes found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProcesses.slice(0, 100).map((proc) => (
                    <TableRow key={proc.pid}>
                      <TableCell>{proc.pid}</TableCell>
                      <TableCell className="font-medium">{proc.name}</TableCell>
                      <TableCell>{proc.username}</TableCell>
                      <TableCell>{proc.cpu_percent.toFixed(2)}%</TableCell>
                      <TableCell>{proc.memory_percent.toFixed(2)}%</TableCell>
                      <TableCell>{proc.status}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <select
                            className="h-8 w-24 rounded-md border border-input bg-background px-2 py-1 text-xs"
                            onChange={(e) => handleSetPriority(proc.pid, parseInt(e.target.value))}
                            value="0" // Default to 0/Normal as we don't know current priority without fetching it
                          >
                            <option value="" disabled>Priority</option>
                            <option value="-10">High</option>
                            <option value="-5">Above Normal</option>
                            <option value="0">Normal</option>
                            <option value="5">Below Normal</option>
                            <option value="10">Low</option>
                            <option value="19">Idle</option>
                          </select>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleKillProcess(proc.pid)}
                          >
                            Kill
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

