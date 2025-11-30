"""Docker container management service."""
import docker
from docker.errors import DockerException, NotFound, APIError
from typing import List, Dict, Any, Optional
from datetime import datetime


class DockerManager:
    """Docker container management service using Docker SDK."""
    
    def __init__(self):
        self._client: Optional[docker.DockerClient] = None
    
    @property
    def client(self) -> docker.DockerClient:
        """Lazy initialization of Docker client."""
        if self._client is None:
            try:
                self._client = docker.from_env()
            except DockerException as e:
                raise Exception(f"Failed to connect to Docker daemon: {str(e)}")
        return self._client
    
    def list_containers(self, all_containers: bool = True) -> List[Dict[str, Any]]:
        """List all containers with their details."""
        try:
            containers = self.client.containers.list(all=all_containers)
            result = []
            for container in containers:
                # Get port mappings
                ports = []
                if container.ports:
                    for container_port, host_bindings in container.ports.items():
                        if host_bindings:
                            for binding in host_bindings:
                                ports.append(f"{binding.get('HostPort', '')}:{container_port}")
                        else:
                            ports.append(container_port)
                
                # Parse created time
                created = container.attrs.get('Created', '')
                if created:
                    # Docker returns ISO format with nanoseconds
                    try:
                        created = created.split('.')[0]  # Remove nanoseconds
                        created_dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
                        created = created_dt.strftime('%Y-%m-%d %H:%M:%S')
                    except (ValueError, AttributeError):
                        pass
                
                result.append({
                    'id': container.short_id,
                    'name': container.name,
                    'image': container.image.tags[0] if container.image.tags else container.image.short_id,
                    'status': container.status,
                    'state': container.attrs.get('State', {}).get('Status', 'unknown'),
                    'ports': ports,
                    'created': created,
                })
            return result
        except DockerException as e:
            raise Exception(f"Failed to list containers: {str(e)}")
    
    def start_container(self, container_id: str) -> bool:
        """Start a stopped container."""
        try:
            container = self.client.containers.get(container_id)
            container.start()
            return True
        except NotFound:
            raise Exception(f"Container {container_id} not found")
        except APIError as e:
            raise Exception(f"Failed to start container: {str(e)}")
    
    def stop_container(self, container_id: str, timeout: int = 10) -> bool:
        """Stop a running container."""
        try:
            container = self.client.containers.get(container_id)
            container.stop(timeout=timeout)
            return True
        except NotFound:
            raise Exception(f"Container {container_id} not found")
        except APIError as e:
            raise Exception(f"Failed to stop container: {str(e)}")
    
    def restart_container(self, container_id: str, timeout: int = 10) -> bool:
        """Restart a container."""
        try:
            container = self.client.containers.get(container_id)
            container.restart(timeout=timeout)
            return True
        except NotFound:
            raise Exception(f"Container {container_id} not found")
        except APIError as e:
            raise Exception(f"Failed to restart container: {str(e)}")
    
    def remove_container(self, container_id: str, force: bool = False) -> bool:
        """Remove a container."""
        try:
            container = self.client.containers.get(container_id)
            container.remove(force=force)
            return True
        except NotFound:
            raise Exception(f"Container {container_id} not found")
        except APIError as e:
            raise Exception(f"Failed to remove container: {str(e)}")
    
    def get_container_logs(self, container_id: str, tail: int = 100) -> str:
        """Get container logs."""
        try:
            container = self.client.containers.get(container_id)
            logs = container.logs(tail=tail, timestamps=True)
            return logs.decode('utf-8', errors='replace')
        except NotFound:
            raise Exception(f"Container {container_id} not found")
        except APIError as e:
            raise Exception(f"Failed to get container logs: {str(e)}")
    
    def list_images(self) -> List[Dict[str, Any]]:
        """List all Docker images."""
        try:
            images = self.client.images.list()
            result = []
            for image in images:
                # Get size in MB
                size_mb = image.attrs.get('Size', 0) / (1024 * 1024)
                
                # Get created time
                created = image.attrs.get('Created', '')
                if created:
                    try:
                        created = created.split('.')[0]
                        created_dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
                        created = created_dt.strftime('%Y-%m-%d %H:%M:%S')
                    except (ValueError, AttributeError):
                        pass
                
                result.append({
                    'id': image.short_id.replace('sha256:', ''),
                    'tags': image.tags if image.tags else ['<none>:<none>'],
                    'size': f"{size_mb:.1f} MB",
                    'created': created,
                })
            return result
        except DockerException as e:
            raise Exception(f"Failed to list images: {str(e)}")
    
    def pull_image(self, image_name: str) -> Dict[str, Any]:
        """Pull an image from registry."""
        try:
            image = self.client.images.pull(image_name)
            return {
                'id': image.short_id.replace('sha256:', ''),
                'tags': image.tags,
                'message': f"Successfully pulled {image_name}"
            }
        except APIError as e:
            raise Exception(f"Failed to pull image {image_name}: {str(e)}")


# Global instance
docker_manager = DockerManager()

