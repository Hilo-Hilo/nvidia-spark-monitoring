"""System metrics collection service."""
import platform
import psutil
import json
import time
import os
import logging
import subprocess
import re
import socket
import urllib.request
from typing import List, Optional, Dict
from app.models.metrics import (
    CPUMetrics, MemoryMetrics, DiskMetrics, NetworkMetrics, GPUMetrics, SystemMetrics, SystemInfo, NetworkInterface
)
from datetime import datetime

logger = logging.getLogger(__name__)

try:
    import pynvml
    NVIDIA_AVAILABLE = True
    pynvml.nvmlInit()
except Exception:
    NVIDIA_AVAILABLE = False


class SystemMonitor:
    """System monitoring service."""
    
    def __init__(self):
        # Track previous network I/O state for rate calculation
        self._network_io_prev = psutil.net_io_counters()
        self._network_io_prev_time = time.time()
        self._network_io_pernic_prev: Dict[str, Dict[str, int]] = {}
        self._network_io_pernic_prev_time = time.time()
    
    def get_cpu_metrics(self) -> CPUMetrics:
        """Get CPU metrics."""
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_count = psutil.cpu_count()
        cpu_freq = psutil.cpu_freq()
        per_cpu = psutil.cpu_percent(percpu=True, interval=0.1)
        
        return CPUMetrics(
            percent=cpu_percent,
            count=cpu_count,
            freq_current=cpu_freq.current if cpu_freq else None,
            per_cpu=per_cpu
        )
    
    def get_memory_metrics(self) -> MemoryMetrics:
        """Get memory metrics."""
        mem = psutil.virtual_memory()
        return MemoryMetrics(
            total=mem.total,
            available=mem.available,
            used=mem.used,
            percent=mem.percent,
            free=mem.free
        )
    
    def get_disk_metrics(self) -> DiskMetrics:
        """Get disk metrics."""
        disk = psutil.disk_usage('/')
        return DiskMetrics(
            total=disk.total,
            used=disk.used,
            free=disk.free,
            percent=(disk.used / disk.total) * 100
        )
    
    def _read_proc_net_dev(self) -> Dict[str, Dict[str, int]]:
        """
        Read network statistics directly from /proc/net/dev (native Linux system call).
        Returns per-interface statistics with bytes and packets.
        """
        interfaces = {}
        try:
            with open('/proc/net/dev', 'r') as f:
                lines = f.readlines()
                for line in lines[2:]:  # Skip header lines
                    parts = line.split()
                    if len(parts) >= 10:
                        interface_name = parts[0].rstrip(':')
                        interfaces[interface_name] = {
                            'bytes_recv': int(parts[1]),
                            'packets_recv': int(parts[2]),
                            'bytes_sent': int(parts[9]),
                            'packets_sent': int(parts[10]),
                        }
        except (IOError, OSError, ValueError) as e:
            # Fallback to psutil if /proc/net/dev is not accessible
            logger.warning(f"Warning: Could not read /proc/net/dev: {e}")
            return {}
        return interfaces
    
    def _get_network_rates_from_system(self, total_bytes_sent: int, total_bytes_recv: int, 
                                         total_packets_sent: int, total_packets_recv: int) -> Dict[str, float]:
        """
        Calculate network rates directly from system using native /proc/net/dev.
        Returns current rates in bytes/second and packets/second.
        """
        current_time = time.time()
        
        # Calculate rates
        time_diff = current_time - self._network_io_prev_time
        
        # Check if we have valid previous state and reasonable time difference
        if (time_diff > 0 and time_diff < 60 and  # Reasonable time window (less than 60 seconds)
            hasattr(self._network_io_prev, 'bytes_sent')):
            bytes_sent_rate = (total_bytes_sent - self._network_io_prev.bytes_sent) / time_diff
            bytes_recv_rate = (total_bytes_recv - self._network_io_prev.bytes_recv) / time_diff
            packets_sent_rate = (total_packets_sent - self._network_io_prev.packets_sent) / time_diff
            packets_recv_rate = (total_packets_recv - self._network_io_prev.packets_recv) / time_diff
        else:
            # First call or invalid time difference - return zero rates
            bytes_sent_rate = 0.0
            bytes_recv_rate = 0.0
            packets_sent_rate = 0.0
            packets_recv_rate = 0.0
        
        # Update previous state
        # Create a mock object with the aggregated values for tracking
        class MockNetIO:
            def __init__(self, bytes_sent, bytes_recv, packets_sent, packets_recv):
                self.bytes_sent = bytes_sent
                self.bytes_recv = bytes_recv
                self.packets_sent = packets_sent
                self.packets_recv = packets_recv
        
        self._network_io_prev = MockNetIO(total_bytes_sent, total_bytes_recv, total_packets_sent, total_packets_recv)
        self._network_io_prev_time = current_time
        
        return {
            'bytes_sent_rate': max(0.0, bytes_sent_rate),
            'bytes_recv_rate': max(0.0, bytes_recv_rate),
            'packets_sent_rate': max(0.0, packets_sent_rate),
            'packets_recv_rate': max(0.0, packets_recv_rate),
        }
    
    def get_network_metrics(self) -> NetworkMetrics:
        """
        Get network metrics with live rates calculated directly from system.
        Uses native Linux /proc/net/dev for direct system access.
        """
        # Get current network I/O from system (using psutil as fallback if /proc/net/dev fails)
        try:
            # Try to read directly from /proc/net/dev first
            interfaces = self._read_proc_net_dev()
            if interfaces:
                # Aggregate from native source
                total_bytes_sent = sum(iface.get('bytes_sent', 0) for iface in interfaces.values())
                total_bytes_recv = sum(iface.get('bytes_recv', 0) for iface in interfaces.values())
                total_packets_sent = sum(iface.get('packets_sent', 0) for iface in interfaces.values())
                total_packets_recv = sum(iface.get('packets_recv', 0) for iface in interfaces.values())
            else:
                # Fallback to psutil
                net_io = psutil.net_io_counters()
                total_bytes_sent = net_io.bytes_sent
                total_bytes_recv = net_io.bytes_recv
                total_packets_sent = net_io.packets_sent
                total_packets_recv = net_io.packets_recv
        except Exception as e:
            # Fallback to psutil on any error
            logger.warning(f"Warning: Error reading network stats, using psutil: {e}")
            net_io = psutil.net_io_counters()
            total_bytes_sent = net_io.bytes_sent
            total_bytes_recv = net_io.bytes_recv
            total_packets_sent = net_io.packets_sent
            total_packets_recv = net_io.packets_recv
        
        # Calculate rates from system
        rates = self._get_network_rates_from_system(
            total_bytes_sent, total_bytes_recv, total_packets_sent, total_packets_recv
        )
        
        # Create metrics with live rates
        metrics = NetworkMetrics(
            bytes_sent=total_bytes_sent,
            bytes_recv=total_bytes_recv,
            packets_sent=total_packets_sent,
            packets_recv=total_packets_recv,
            bytes_sent_rate=rates['bytes_sent_rate'],
            bytes_recv_rate=rates['bytes_recv_rate'],
            packets_sent_rate=rates['packets_sent_rate'],
            packets_recv_rate=rates['packets_recv_rate']
        )
        
        return metrics
    
    def get_network_metrics_pernic(self) -> Dict[str, Dict[str, float]]:
        """
        Get per-interface network metrics with rates.
        Returns a dictionary keyed by interface name with bytes, packets, and rates.
        """
        current_time = time.time()
        current_interfaces = self._read_proc_net_dev()
        
        if not current_interfaces:
            # Fallback to psutil
            try:
                pernic = psutil.net_io_counters(pernic=True)
                current_interfaces = {}
                for iface_name, net_io in pernic.items():
                    current_interfaces[iface_name] = {
                        'bytes_recv': net_io.bytes_recv,
                        'packets_recv': net_io.packets_recv,
                        'bytes_sent': net_io.bytes_sent,
                        'packets_sent': net_io.packets_sent,
                    }
            except Exception as e:
                logger.warning(f"Warning: Could not get per-interface stats: {e}")
                return {}
        
        result = {}
        time_diff = current_time - self._network_io_pernic_prev_time
        
        for iface_name, stats in current_interfaces.items():
            # Skip loopback interfaces for cleaner output (optional)
            if iface_name.startswith('lo'):
                continue
                
            prev_stats = self._network_io_pernic_prev.get(iface_name)
            
            if prev_stats and time_diff > 0:
                bytes_sent_rate = (stats['bytes_sent'] - prev_stats['bytes_sent']) / time_diff
                bytes_recv_rate = (stats['bytes_recv'] - prev_stats['bytes_recv']) / time_diff
                packets_sent_rate = (stats['packets_sent'] - prev_stats['packets_sent']) / time_diff
                packets_recv_rate = (stats['packets_recv'] - prev_stats['packets_recv']) / time_diff
            else:
                bytes_sent_rate = 0.0
                bytes_recv_rate = 0.0
                packets_sent_rate = 0.0
                packets_recv_rate = 0.0
            
            result[iface_name] = {
                'bytes_sent': stats['bytes_sent'],
                'bytes_recv': stats['bytes_recv'],
                'packets_sent': stats['packets_sent'],
                'packets_recv': stats['packets_recv'],
                'bytes_sent_rate': max(0.0, bytes_sent_rate),
                'bytes_recv_rate': max(0.0, bytes_recv_rate),
                'packets_sent_rate': max(0.0, packets_sent_rate),
                'packets_recv_rate': max(0.0, packets_recv_rate),
            }
        
        # Update previous state
        self._network_io_pernic_prev = current_interfaces.copy()
        self._network_io_pernic_prev_time = current_time
        
        return result
    
    def get_gpu_metrics(self) -> List[GPUMetrics]:
        """Get NVIDIA GPU metrics."""
        if not NVIDIA_AVAILABLE:
            return []
        
        gpus = []
        try:
            device_count = pynvml.nvmlDeviceGetCount()
            for i in range(device_count):
                handle = pynvml.nvmlDeviceGetHandleByIndex(i)
                name = pynvml.nvmlDeviceGetName(handle).decode('utf-8')
                temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
                util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                
                try:
                    power = pynvml.nvmlDeviceGetPowerUsage(handle) / 1000.0  # Convert to watts
                except:
                    power = None
                
                gpus.append(GPUMetrics(
                    index=i,
                    name=name,
                    temperature=temp,
                    utilization=util.gpu,
                    memory_used=mem_info.used,
                    memory_total=mem_info.total,
                    memory_percent=(mem_info.used / mem_info.total) * 100,
                    power_draw=power
                ))
        except Exception as e:
            logger.error(f"Error getting GPU metrics: {e}")
        
        return gpus
    
    def get_network_interfaces(self) -> List[NetworkInterface]:
        """Get network interface information (like ifconfig)."""
        interfaces = []
        try:
            net_if_addrs = psutil.net_if_addrs()
            net_if_stats = psutil.net_if_stats()
            
            for interface_name, addrs in net_if_addrs.items():
                # Skip loopback interfaces
                if interface_name.startswith('lo'):
                    continue
                
                ipv4_addresses = []
                ipv6_addresses = []
                mac_address = None
                
                for addr in addrs:
                    if addr.family == socket.AF_INET:
                        ipv4_addresses.append(addr.address)
                    elif addr.family == socket.AF_INET6:
                        # Skip link-local IPv6 addresses
                        if not addr.address.startswith('fe80:'):
                            ipv6_addresses.append(addr.address)
                    elif addr.family == psutil.AF_LINK:
                        mac_address = addr.address
                
                # Get interface status and MTU
                is_up = False
                mtu = None
                if interface_name in net_if_stats:
                    stats = net_if_stats[interface_name]
                    is_up = stats.isup
                    mtu = stats.mtu
                
                # Only include interfaces that are up or have IP addresses
                if is_up or ipv4_addresses or ipv6_addresses:
                    interfaces.append(NetworkInterface(
                        name=interface_name,
                        ipv4_addresses=ipv4_addresses,
                        ipv6_addresses=ipv6_addresses,
                        mac_address=mac_address,
                        is_up=is_up,
                        mtu=mtu
                    ))
        except Exception as e:
            logger.error(f"Error getting network interfaces: {e}")
        
        return interfaces
    
    def get_public_ip(self) -> Optional[str]:
        """Get public IP address using external service."""
        services = [
            'https://api.ipify.org',
            'https://icanhazip.com',
            'https://ifconfig.me/ip',
            'https://checkip.amazonaws.com'
        ]
        
        for service in services:
            try:
                with urllib.request.urlopen(service, timeout=3) as response:
                    ip = response.read().decode('utf-8').strip()
                    # Validate IP address format (IPv4 or IPv6)
                    try:
                        socket.inet_aton(ip)  # IPv4
                    except socket.error:
                        try:
                            socket.inet_pton(socket.AF_INET6, ip)  # IPv6
                        except (socket.error, ValueError):
                            continue  # Invalid IP format
                    return ip
            except Exception as e:
                logger.debug(f"Failed to get public IP from {service}: {e}")
                continue
        
        return None
    
    def get_system_info(self) -> SystemInfo:
        """Get general system information."""
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime = (datetime.now() - boot_time).total_seconds()
        
        # Determine Hostname
        hostname = platform.node()
        # Try to read from mounted host hostname file if available
        if os.path.exists('/etc/host_hostname'):
            try:
                with open('/etc/host_hostname', 'r') as f:
                    content = f.read().strip()
                    if content:
                        hostname = content
            except Exception as e:
                logger.warning(f"Failed to read /etc/host_hostname: {e}")

        # Determine Processor Name
        processor_name = platform.processor()
        
        # Strategy 1: Try lscpu (Works well on ARM/Grace)
        try:
            result = subprocess.run(['lscpu'], capture_output=True, text=True)
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    if line.startswith('Model name:'):
                        processor_name = line.split(':', 1)[1].strip()
                        break
        except Exception as e:
            logger.debug(f"lscpu failed: {e}")
            
            # Strategy 2: Try /proc/cpuinfo fallback (Standard Linux x86)
            if processor_name == "unknown" or not processor_name:
                if platform.system() == "Linux":
                    try:
                        with open("/proc/cpuinfo", "r") as f:
                            for line in f:
                                if "model name" in line:
                                    processor_name = line.split(":")[1].strip()
                                    break
                    except Exception:
                        pass
        
        # Get network interfaces and public IP
        network_interfaces = self.get_network_interfaces()
        public_ip = self.get_public_ip()
        
        return SystemInfo(
            hostname=hostname,
            os=platform.system(),
            os_release=platform.release(),
            os_version=platform.version(),
            machine=platform.machine(),
            processor=processor_name,
            cpu_count=psutil.cpu_count(logical=True),
            cpu_cores=psutil.cpu_count(logical=False),
            total_memory=psutil.virtual_memory().total,
            uptime=uptime,
            boot_time=boot_time,
            network_interfaces=network_interfaces,
            public_ip=public_ip
        )
    
    def reboot_system(self) -> bool:
        """Reboot the system."""
        try:
            # Try systemd-based reboot first (common in modern Linux)
            # This requires DBus access, which is often restricted in containers
            # But direct 'reboot' command should work with SYS_BOOT cap
            
            logger.info("Attempting system reboot...")
            
            # Method 1: Standard reboot command
            # In a privileged container with SYS_BOOT, this signals the kernel to reboot
            # However, some container runtimes capture this and just stop the container
            # We can try to use magic SysRq if enabled, or just standard tools
            
            # Try /sbin/reboot directly
            if os.path.exists("/sbin/reboot"):
                ret = subprocess.run(["/sbin/reboot"], capture_output=True)
                if ret.returncode == 0:
                    return True
            
            # Method 2: os.system fallback
            ret = os.system("reboot")
            if ret == 0:
                return True
                
            # Method 3: sudo reboot (if sudo is installed/configured)
            ret = os.system("sudo reboot")
            if ret == 0:
                return True
                
            # Method 4: Force immediate reboot via sysrq (dangerous but effective)
            # echo b > /proc/sysrq-trigger
            if os.path.exists("/proc/sysrq-trigger"):
                try:
                    with open("/proc/sysrq-trigger", "w") as f:
                        f.write("b")
                    return True
                except Exception as e:
                    logger.error(f"SysRq reboot failed: {e}")

            logger.error("All reboot methods failed")
            return False
        except Exception as e:
            logger.error(f"Failed to reboot system: {e}")
            return False
    
    def get_all_metrics(self) -> SystemMetrics:
        """Get all system metrics."""
        return SystemMetrics(
            timestamp=datetime.now(),
            cpu=self.get_cpu_metrics(),
            memory=self.get_memory_metrics(),
            disk=self.get_disk_metrics(),
            network=self.get_network_metrics(),
            gpus=self.get_gpu_metrics()
        )


# Global instance
system_monitor = SystemMonitor()

