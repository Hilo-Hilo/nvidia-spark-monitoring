'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api, SystemInfo } from '@/lib/api';
import { auth } from '@/lib/auth';
import { formatDistance } from 'date-fns';
import { Power } from 'lucide-react';

export function SystemInfoCard() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(auth.isAuthenticated());
    
    const fetchInfo = async () => {
      try {
        const response = await api.metrics.getSystemInfo();
        setInfo(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to load system info');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, []);

  const handleRestart = async () => {
    setRestarting(true);
    try {
      await api.metrics.restartSystem();
      alert('System restart initiated. The dashboard will become unavailable shortly.');
      setShowRestartDialog(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to initiate restart');
    } finally {
      setRestarting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !info) {
    return null; // Hide card on error
  }

  // Format uptime
  const uptimeDuration = formatDistance(0, info.uptime * 1000, { includeSeconds: true });
  
  // Format memory
  const totalMemoryGB = (info.total_memory / 1024 / 1024 / 1024).toFixed(2);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>System Information</CardTitle>
          {isAuthenticated && (
            <Button 
              variant="destructive" 
              size="sm" 
              className="h-8 gap-2"
              onClick={() => setShowRestartDialog(true)}
            >
              <Power className="h-4 w-4" />
              Restart System
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm mt-2">
            <div>
              <span className="text-muted-foreground block text-xs uppercase tracking-wider">Hostname</span>
              <span className="font-medium truncate block" title={info.hostname}>{info.hostname}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs uppercase tracking-wider">OS</span>
              <span className="font-medium block truncate" title={`${info.os} ${info.os_release}`}>
                {info.os} {info.os_release}
              </span>
            </div>
            <div className="lg:col-span-2">
              <span className="text-muted-foreground block text-xs uppercase tracking-wider">Processor</span>
              <span className="font-medium truncate block" title={info.processor}>
                {info.processor || 'Unknown'}
                <span className="text-muted-foreground ml-1 font-normal">
                  ({info.cpu_cores} cores / {info.cpu_count} threads)
                </span>
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs uppercase tracking-wider">Uptime</span>
              <span className="font-medium">{uptimeDuration}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs uppercase tracking-wider">Memory</span>
              <span className="font-medium">{totalMemoryGB} GB</span>
            </div>
          </div>

          {/* Network Information Section */}
          {(info.public_ip || (info.network_interfaces && info.network_interfaces.length > 0)) && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Network Information</h3>
              
              {/* Public IP */}
              {info.public_ip && (
                <div className="mb-4">
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Public IP</span>
                  <span className="font-medium font-mono">{info.public_ip}</span>
                </div>
              )}

              {/* Network Interfaces */}
              {info.network_interfaces && info.network_interfaces.length > 0 && (
                <div className="space-y-4">
                  {info.network_interfaces.map((iface, idx) => (
                    <div key={idx} className="p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{iface.name}</span>
                        <div className="flex items-center gap-2 text-xs">
                          {iface.is_up ? (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-700 dark:text-green-400 rounded">UP</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-500/20 text-gray-700 dark:text-gray-400 rounded">DOWN</span>
                          )}
                          {iface.mtu && (
                            <span className="text-muted-foreground">MTU: {iface.mtu}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 text-xs">
                        {/* MAC Address */}
                        {iface.mac_address && (
                          <div>
                            <span className="text-muted-foreground">MAC: </span>
                            <span className="font-mono font-medium">{iface.mac_address}</span>
                          </div>
                        )}
                        
                        {/* IPv4 Addresses */}
                        {iface.ipv4_addresses.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">IPv4: </span>
                            {iface.ipv4_addresses.map((ip, ipIdx) => (
                              <span key={ipIdx} className="font-mono font-medium">
                                {ip}
                                {ipIdx < iface.ipv4_addresses.length - 1 && ', '}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* IPv6 Addresses */}
                        {iface.ipv6_addresses.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">IPv6: </span>
                            {iface.ipv6_addresses.map((ip, ipIdx) => (
                              <span key={ipIdx} className="font-mono font-medium">
                                {ip}
                                {ipIdx < iface.ipv6_addresses.length - 1 && ', '}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restart System</DialogTitle>
            <DialogDescription>
              Are you sure you want to restart the system? This will reboot the host machine and the monitoring service will be unavailable until it boots back up.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestartDialog(false)} disabled={restarting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRestart} disabled={restarting}>
              {restarting ? 'Restarting...' : 'Restart'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
