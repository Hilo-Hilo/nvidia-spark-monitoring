"""Systemd service management service using D-Bus.

This module provides systemd service management capabilities by connecting
to the host's systemd via D-Bus. When running in a Docker container,
the host's D-Bus socket must be mounted for this to work.
"""
import subprocess
from typing import List, Dict, Any, Optional

# Try to import D-Bus library
DBUS_AVAILABLE = False
try:
    import dbus
    DBUS_AVAILABLE = True
except ImportError:
    pass


class SystemdManager:
    """Systemd service management using D-Bus or subprocess fallback."""
    
    def __init__(self):
        self._bus = None
        self._systemd = None
        self._manager = None
        self._use_dbus = DBUS_AVAILABLE
    
    def _get_systemd_manager(self):
        """Get the systemd manager interface via D-Bus."""
        if not self._use_dbus:
            return None
            
        try:
            if self._bus is None:
                self._bus = dbus.SystemBus()
            if self._systemd is None:
                self._systemd = self._bus.get_object(
                    'org.freedesktop.systemd1',
                    '/org/freedesktop/systemd1'
                )
            if self._manager is None:
                self._manager = dbus.Interface(
                    self._systemd,
                    'org.freedesktop.systemd1.Manager'
                )
            return self._manager
        except Exception as e:
            # D-Bus connection failed, fall back to subprocess
            print(f"D-Bus connection failed: {e}, falling back to subprocess")
            self._use_dbus = False
            return None
    
    def _run_command(self, command: List[str], check: bool = True) -> subprocess.CompletedProcess:
        """Run a command via subprocess (fallback method)."""
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=30
            )
            if check and result.returncode != 0:
                raise Exception(result.stderr or f"Command failed with code {result.returncode}")
            return result
        except subprocess.TimeoutExpired:
            raise Exception(f"Command timed out: {' '.join(command)}")
        except Exception as e:
            raise Exception(f"Failed to run command: {str(e)}")
    
    def list_services(self) -> List[Dict[str, Any]]:
        """List all systemd services with their status."""
        manager = self._get_systemd_manager()
        
        if manager:
            # Use D-Bus
            try:
                units = manager.ListUnits()
                services = []
                
                for unit in units:
                    name = str(unit[0])
                    description = str(unit[1])
                    load_state = str(unit[2])
                    active_state = str(unit[3])
                    sub_state = str(unit[4])
                    
                    if not name.endswith('.service'):
                        continue
                    
                    service_name = name[:-8]  # Remove .service suffix
                    
                    # Check if enabled
                    try:
                        unit_file_state = manager.GetUnitFileState(name)
                        enabled = str(unit_file_state) in ('enabled', 'enabled-runtime', 'static')
                    except Exception:
                        enabled = False
                    
                    services.append({
                        'name': service_name,
                        'description': description,
                        'load_state': load_state,
                        'active_state': active_state,
                        'sub_state': sub_state,
                        'enabled': enabled,
                    })
                
                services.sort(key=lambda x: x['name'])
                return services
            except Exception as e:
                # Fall back to subprocess on D-Bus error
                print(f"D-Bus ListUnits failed: {e}, falling back to subprocess")
                return self._list_services_subprocess()
        else:
            # Fallback to subprocess
            return self._list_services_subprocess()
    
    def _list_services_subprocess(self) -> List[Dict[str, Any]]:
        """List services using subprocess (fallback)."""
        try:
            import json
            result = self._run_command([
                'systemctl', 'list-units', '--type=service', '--all', 
                '--no-pager', '--output=json'
            ], check=False)
            
            services = []
            
            try:
                units = json.loads(result.stdout)
                for unit in units:
                    name = unit.get('unit', '')
                    if name.endswith('.service'):
                        name = name[:-8]
                    
                    services.append({
                        'name': name,
                        'description': unit.get('description', ''),
                        'load_state': unit.get('load', 'unknown'),
                        'active_state': unit.get('active', 'unknown'),
                        'sub_state': unit.get('sub', 'unknown'),
                        'enabled': self._is_service_enabled_subprocess(name),
                    })
            except json.JSONDecodeError:
                # Parse text output
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    if '.service' in line and not line.startswith('UNIT'):
                        parts = line.split()
                        if len(parts) >= 4:
                            name = parts[0].replace('.service', '')
                            services.append({
                                'name': name,
                                'description': ' '.join(parts[4:]) if len(parts) > 4 else '',
                                'load_state': parts[1] if len(parts) > 1 else 'unknown',
                                'active_state': parts[2] if len(parts) > 2 else 'unknown',
                                'sub_state': parts[3] if len(parts) > 3 else 'unknown',
                                'enabled': self._is_service_enabled_subprocess(name),
                            })
            
            services.sort(key=lambda x: x['name'])
            return services
        except Exception as e:
            raise Exception(f"Failed to list services: {str(e)}")
    
    def _is_service_enabled_subprocess(self, service_name: str) -> bool:
        """Check if a service is enabled using subprocess."""
        try:
            result = subprocess.run(
                ['systemctl', 'is-enabled', f'{service_name}.service'],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.stdout.strip() == 'enabled'
        except Exception:
            return False
    
    def start_service(self, service_name: str) -> bool:
        """Start a service."""
        manager = self._get_systemd_manager()
        
        if manager:
            try:
                manager.StartUnit(f'{service_name}.service', 'replace')
                return True
            except Exception as e:
                raise Exception(f"Failed to start service {service_name}: {str(e)}")
        else:
            try:
                self._run_command(['systemctl', 'start', f'{service_name}.service'])
                return True
            except Exception as e:
                raise Exception(f"Failed to start service {service_name}: {str(e)}")
    
    def stop_service(self, service_name: str) -> bool:
        """Stop a service."""
        manager = self._get_systemd_manager()
        
        if manager:
            try:
                manager.StopUnit(f'{service_name}.service', 'replace')
                return True
            except Exception as e:
                raise Exception(f"Failed to stop service {service_name}: {str(e)}")
        else:
            try:
                self._run_command(['systemctl', 'stop', f'{service_name}.service'])
                return True
            except Exception as e:
                raise Exception(f"Failed to stop service {service_name}: {str(e)}")
    
    def restart_service(self, service_name: str) -> bool:
        """Restart a service."""
        manager = self._get_systemd_manager()
        
        if manager:
            try:
                manager.RestartUnit(f'{service_name}.service', 'replace')
                return True
            except Exception as e:
                raise Exception(f"Failed to restart service {service_name}: {str(e)}")
        else:
            try:
                self._run_command(['systemctl', 'restart', f'{service_name}.service'])
                return True
            except Exception as e:
                raise Exception(f"Failed to restart service {service_name}: {str(e)}")
    
    def enable_service(self, service_name: str) -> bool:
        """Enable a service to start on boot."""
        manager = self._get_systemd_manager()
        
        if manager:
            try:
                manager.EnableUnitFiles([f'{service_name}.service'], False, True)
                return True
            except Exception as e:
                raise Exception(f"Failed to enable service {service_name}: {str(e)}")
        else:
            try:
                self._run_command(['systemctl', 'enable', f'{service_name}.service'])
                return True
            except Exception as e:
                raise Exception(f"Failed to enable service {service_name}: {str(e)}")
    
    def disable_service(self, service_name: str) -> bool:
        """Disable a service from starting on boot."""
        manager = self._get_systemd_manager()
        
        if manager:
            try:
                manager.DisableUnitFiles([f'{service_name}.service'], False)
                return True
            except Exception as e:
                raise Exception(f"Failed to disable service {service_name}: {str(e)}")
        else:
            try:
                self._run_command(['systemctl', 'disable', f'{service_name}.service'])
                return True
            except Exception as e:
                raise Exception(f"Failed to disable service {service_name}: {str(e)}")
    
    def get_service_logs(self, service_name: str, lines: int = 100) -> str:
        """Get service logs from journalctl."""
        # journalctl doesn't have a D-Bus interface, always use subprocess
        # When running in a container, we need to specify the journal directory
        import os
        try:
            cmd = ['journalctl', '-u', f'{service_name}.service', '-n', str(lines), '--no-pager']
            
            # If running in container with mounted journal, use -D to specify directory
            journal_dir = '/var/log/journal'
            if os.path.isdir(journal_dir) and os.listdir(journal_dir):
                # Find the machine-id subdirectory
                subdirs = [d for d in os.listdir(journal_dir) if os.path.isdir(os.path.join(journal_dir, d))]
                if subdirs:
                    cmd = ['journalctl', '-D', journal_dir, '-u', f'{service_name}.service', '-n', str(lines), '--no-pager']
            
            result = self._run_command(cmd, check=False)
            return result.stdout or "No logs available"
        except Exception as e:
            raise Exception(f"Failed to get logs for service {service_name}: {str(e)}")
    
    def get_service_status(self, service_name: str) -> Dict[str, Any]:
        """Get detailed status of a service."""
        try:
            result = self._run_command([
                'systemctl', 'status', f'{service_name}.service', '--no-pager'
            ], check=False)
            
            manager = self._get_systemd_manager()
            enabled = False
            
            if manager:
                try:
                    unit_file_state = manager.GetUnitFileState(f'{service_name}.service')
                    enabled = str(unit_file_state) in ('enabled', 'enabled-runtime', 'static')
                except Exception:
                    enabled = self._is_service_enabled_subprocess(service_name)
            else:
                enabled = self._is_service_enabled_subprocess(service_name)
            
            return {
                'name': service_name,
                'status_output': result.stdout,
                'is_active': 'active (running)' in result.stdout.lower(),
                'enabled': enabled,
            }
        except Exception as e:
            raise Exception(f"Failed to get status for service {service_name}: {str(e)}")


# Global instance
systemd_manager = SystemdManager()
