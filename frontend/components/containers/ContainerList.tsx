'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { InfoIcon } from '@/components/ui/info-icon';
import { LogsModal } from '@/components/ui/logs-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { auth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Play, Square, RotateCw, Trash2, FileText, Download } from 'lucide-react';

interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string[];
  created: string;
}

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:8000/api/v1';
  }
  const { protocol, hostname, port } = window.location;
  if (port === '3000') {
    return `${protocol}//${hostname}:8000/api/v1`;
  }
  const normalizedPort = port && port !== '' ? `:${port}` : '';
  return `${protocol}//${hostname}${normalizedPort}/api/v1`;
};

export function ContainerList() {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Logs modal state
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsTitle, setLogsTitle] = useState('');
  const [logs, setLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [currentLogContainer, setCurrentLogContainer] = useState<string | null>(null);
  
  // Pull image modal state
  const [pullModalOpen, setPullModalOpen] = useState(false);
  const [imageName, setImageName] = useState('');
  const [pullLoading, setPullLoading] = useState(false);
  
  const router = useRouter();

  const fetchContainers = async () => {
    try {
      const token = auth.getToken();
      const response = await fetch(`${getApiBase()}/containers/?all_containers=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch containers');
      }
      
      const data = await response.json();
      setContainers(data.containers);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch containers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchContainers();
    const interval = setInterval(fetchContainers, 10000);
    return () => clearInterval(interval);
  }, [router]);

  const handleContainerAction = async (containerId: string, action: 'start' | 'stop' | 'restart' | 'remove') => {
    setActionLoading(`${containerId}-${action}`);
    try {
      const token = auth.getToken();
      const method = action === 'remove' ? 'DELETE' : 'POST';
      const url = action === 'remove' 
        ? `${getApiBase()}/containers/${containerId}?force=true`
        : `${getApiBase()}/containers/${containerId}/${action}`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || `Failed to ${action} container`);
      }
      
      await fetchContainers();
    } catch (err: any) {
      alert(err.message || `Failed to ${action} container`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewLogs = async (containerId: string, containerName: string) => {
    setCurrentLogContainer(containerId);
    setLogsTitle(`Logs: ${containerName}`);
    setLogsOpen(true);
    setLogsLoading(true);
    
    try {
      const token = auth.getToken();
      const response = await fetch(`${getApiBase()}/containers/${containerId}/logs?tail=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      
      const data = await response.json();
      setLogs(data.logs);
    } catch (err: any) {
      setLogs(`Error: ${err.message || 'Failed to fetch logs'}`);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleRefreshLogs = async () => {
    if (!currentLogContainer) return;
    setLogsLoading(true);
    
    try {
      const token = auth.getToken();
      const response = await fetch(`${getApiBase()}/containers/${currentLogContainer}/logs?tail=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      
      const data = await response.json();
      setLogs(data.logs);
    } catch (err: any) {
      setLogs(`Error: ${err.message || 'Failed to fetch logs'}`);
    } finally {
      setLogsLoading(false);
    }
  };

  const handlePullImage = async () => {
    if (!imageName.trim()) return;
    
    setPullLoading(true);
    try {
      const token = auth.getToken();
      const response = await fetch(`${getApiBase()}/containers/images/pull`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_name: imageName }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to pull image');
      }
      
      setPullModalOpen(false);
      setImageName('');
      alert('Image pulled successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to pull image');
    } finally {
      setPullLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('running') || statusLower === 'up') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Running</span>;
    } else if (statusLower.includes('exited') || statusLower === 'dead') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Exited</span>;
    } else if (statusLower.includes('paused')) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Paused</span>;
    } else if (statusLower.includes('created')) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Created</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">{status}</span>;
  };

  const filteredContainers = useMemo(() => {
    let filtered = [...containers];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status.toLowerCase().includes(filterStatus));
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(search) ||
        c.image.toLowerCase().includes(search) ||
        c.id.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [containers, searchTerm, filterStatus]);

  if (loading) {
    return <Card><CardContent className="p-6">Loading containers...</CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="p-6 text-destructive">{error}</CardContent></Card>;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>
                  Docker Containers ({filteredContainers.length} / {containers.length})
                </CardTitle>
                <InfoIcon 
                  title="Docker Containers" 
                  content="This table shows all Docker containers on the system. You can start, stop, restart, or remove containers. View logs to see container output. Use 'Pull Image' to download new images from Docker Hub or other registries."
                />
              </div>
              <Button onClick={() => setPullModalOpen(true)} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Pull Image
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by name, image, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="all">All Containers</option>
                    <option value="running">Running</option>
                    <option value="exited">Exited</option>
                    <option value="paused">Paused</option>
                    <option value="created">Created</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ports</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContainers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No containers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContainers.map((container) => (
                      <TableRow key={container.id}>
                        <TableCell className="font-medium">{container.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{container.image}</TableCell>
                        <TableCell>{getStatusBadge(container.status)}</TableCell>
                        <TableCell className="text-sm">
                          {container.ports.length > 0 ? container.ports.join(', ') : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{container.created}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {container.status.toLowerCase().includes('running') ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleContainerAction(container.id, 'stop')}
                                disabled={actionLoading === `${container.id}-stop`}
                                title="Stop"
                              >
                                <Square className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleContainerAction(container.id, 'start')}
                                disabled={actionLoading === `${container.id}-start`}
                                title="Start"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleContainerAction(container.id, 'restart')}
                              disabled={actionLoading === `${container.id}-restart`}
                              title="Restart"
                            >
                              <RotateCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewLogs(container.id, container.name)}
                              title="View Logs"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Are you sure you want to remove container "${container.name}"?`)) {
                                  handleContainerAction(container.id, 'remove');
                                }
                              }}
                              disabled={actionLoading === `${container.id}-remove`}
                              title="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* Logs Modal */}
      <LogsModal
        open={logsOpen}
        onOpenChange={setLogsOpen}
        title={logsTitle}
        logs={logs}
        isLoading={logsLoading}
        onRefresh={handleRefreshLogs}
      />

      {/* Pull Image Modal */}
      <Dialog open={pullModalOpen} onOpenChange={setPullModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pull Docker Image</DialogTitle>
            <DialogDescription>
              Enter the image name to pull from Docker Hub or another registry.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              placeholder="e.g., nginx:latest, ubuntu:22.04"
              value={imageName}
              onChange={(e) => setImageName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPullModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePullImage} disabled={pullLoading || !imageName.trim()}>
              {pullLoading ? 'Pulling...' : 'Pull Image'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

