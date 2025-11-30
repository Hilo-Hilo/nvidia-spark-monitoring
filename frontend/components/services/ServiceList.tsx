'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { InfoIcon } from '@/components/ui/info-icon';
import { LogsModal } from '@/components/ui/logs-modal';
import { auth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Play, Square, RotateCw, FileText, Power, PowerOff } from 'lucide-react';

interface ServiceInfo {
  name: string;
  description: string;
  load_state: string;
  active_state: string;
  sub_state: string;
  enabled: boolean;
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

export function ServiceList() {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEnabled, setFilterEnabled] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Logs modal state
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsTitle, setLogsTitle] = useState('');
  const [logs, setLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [currentLogService, setCurrentLogService] = useState<string | null>(null);
  
  const router = useRouter();

  const fetchServices = async () => {
    try {
      const token = auth.getToken();
      const response = await fetch(`${getApiBase()}/services/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }
      
      const data = await response.json();
      setServices(data.services);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchServices();
  }, [router]);

  const handleServiceAction = async (serviceName: string, action: 'start' | 'stop' | 'restart' | 'enable' | 'disable') => {
    setActionLoading(`${serviceName}-${action}`);
    try {
      const token = auth.getToken();
      const response = await fetch(`${getApiBase()}/services/${serviceName}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || `Failed to ${action} service`);
      }
      
      await fetchServices();
    } catch (err: any) {
      alert(err.message || `Failed to ${action} service`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewLogs = async (serviceName: string) => {
    setCurrentLogService(serviceName);
    setLogsTitle(`Logs: ${serviceName}`);
    setLogsOpen(true);
    setLogsLoading(true);
    
    try {
      const token = auth.getToken();
      const response = await fetch(`${getApiBase()}/services/${serviceName}/logs?lines=100`, {
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
    if (!currentLogService) return;
    setLogsLoading(true);
    
    try {
      const token = auth.getToken();
      const response = await fetch(`${getApiBase()}/services/${currentLogService}/logs?lines=100`, {
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

  const getStatusBadge = (activeState: string, subState: string) => {
    const state = activeState.toLowerCase();
    if (state === 'active') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{subState}</span>;
    } else if (state === 'failed') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Failed</span>;
    } else if (state === 'inactive') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">Inactive</span>;
    } else if (state === 'activating') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Starting</span>;
    } else if (state === 'deactivating') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Stopping</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">{activeState}</span>;
  };

  const getEnabledBadge = (enabled: boolean) => {
    if (enabled) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Enabled</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">Disabled</span>;
  };

  // Common system service prefixes - these are typically core OS services
  const systemServicePrefixes = [
    'systemd-', 'dbus', 'NetworkManager', 'ModemManager', 'accounts-daemon',
    'avahi-', 'bluetooth', 'colord', 'cron', 'cups', 'gdm', 'getty@',
    'irqbalance', 'kerneloops', 'networkd-', 'polkit', 'rsyslog', 'rtkit',
    'snapd', 'ssh', 'thermald', 'udev', 'udisks', 'ufw', 'unattended-upgrades',
    'upower', 'user@', 'wpa_supplicant', 'plymouth', 'apparmor', 'apport',
    'cloud-', 'containerd', 'docker', 'fwupd', 'grub', 'multipathd',
    'nvidia-', 'openvpn', 'packagekit', 'power-profiles-daemon', 'setvtrgb',
    'switcheroo', 'tailscaled', 'whoopsie'
  ];

  const isSystemService = (serviceName: string): boolean => {
    const name = serviceName.toLowerCase();
    return systemServicePrefixes.some(prefix => name.startsWith(prefix.toLowerCase()));
  };

  const getTypeBadge = (serviceName: string) => {
    if (isSystemService(serviceName)) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">System</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">User</span>;
  };

  const filteredServices = useMemo(() => {
    let filtered = [...services];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(s => s.active_state.toLowerCase() === filterStatus);
    }

    // Filter by enabled state
    if (filterEnabled !== 'all') {
      filtered = filtered.filter(s => filterEnabled === 'enabled' ? s.enabled : !s.enabled);
    }

    // Filter by type (system vs user)
    if (filterType !== 'all') {
      if (filterType === 'system') {
        filtered = filtered.filter(s => isSystemService(s.name));
      } else if (filterType === 'user') {
        filtered = filtered.filter(s => !isSystemService(s.name));
      }
    }

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(search) ||
        s.description.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [services, searchTerm, filterStatus, filterEnabled, filterType]);

  if (loading) {
    return <Card><CardContent className="p-6">Loading services...</CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="p-6 text-destructive">{error}</CardContent></Card>;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>
                Systemd Services ({filteredServices.length} / {services.length})
              </CardTitle>
              <InfoIcon 
                title="Systemd Services" 
                content="This table shows all systemd services on the system. You can start, stop, or restart services. Enable/Disable controls whether the service starts automatically on boot. View logs to see service output from journalctl."
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by name or description..."
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
                    <option value="all">All States</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div>
                  <select
                    value={filterEnabled}
                    onChange={(e) => setFilterEnabled(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="all">All</option>
                    <option value="enabled">Enabled on Boot</option>
                    <option value="disabled">Disabled on Boot</option>
                  </select>
                </div>
                <div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="all">All Types</option>
                    <option value="system">System Services</option>
                    <option value="user">User Services</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Boot</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No services found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredServices.slice(0, 100).map((service) => (
                      <TableRow key={service.name}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                          {service.description || '-'}
                        </TableCell>
                        <TableCell>{getTypeBadge(service.name)}</TableCell>
                        <TableCell>{getStatusBadge(service.active_state, service.sub_state)}</TableCell>
                        <TableCell>{getEnabledBadge(service.enabled)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {service.active_state.toLowerCase() === 'active' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleServiceAction(service.name, 'stop')}
                                disabled={actionLoading === `${service.name}-stop`}
                                title="Stop"
                              >
                                <Square className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleServiceAction(service.name, 'start')}
                                disabled={actionLoading === `${service.name}-start`}
                                title="Start"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleServiceAction(service.name, 'restart')}
                              disabled={actionLoading === `${service.name}-restart`}
                              title="Restart"
                            >
                              <RotateCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewLogs(service.name)}
                              title="View Logs"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            {service.enabled ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleServiceAction(service.name, 'disable')}
                                disabled={actionLoading === `${service.name}-disable`}
                                title="Disable on Boot"
                              >
                                <PowerOff className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleServiceAction(service.name, 'enable')}
                                disabled={actionLoading === `${service.name}-enable`}
                                title="Enable on Boot"
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredServices.length > 100 && (
              <div className="mt-4 text-sm text-muted-foreground text-center">
                Showing first 100 of {filteredServices.length} services. Use search to find specific services.
              </div>
            )}
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
    </>
  );
}

