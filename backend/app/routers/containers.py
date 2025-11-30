"""Docker container management endpoints (authentication required)."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.models.database import User
from app.auth import get_current_active_user
from app.services.docker_manager import docker_manager

router = APIRouter()


class ContainerInfo(BaseModel):
    """Container information model."""
    id: str
    name: str
    image: str
    status: str
    state: str
    ports: List[str]
    created: str


class ContainerListResponse(BaseModel):
    """Response model for container list."""
    containers: List[ContainerInfo]
    total: int


class ImageInfo(BaseModel):
    """Image information model."""
    id: str
    tags: List[str]
    size: str
    created: str


class ImageListResponse(BaseModel):
    """Response model for image list."""
    images: List[ImageInfo]
    total: int


class PullImageRequest(BaseModel):
    """Request model for pulling an image."""
    image_name: str


class LogsResponse(BaseModel):
    """Response model for container logs."""
    container_id: str
    logs: str


@router.get("/", response_model=ContainerListResponse)
def list_containers(
    all_containers: bool = Query(True, description="Include stopped containers"),
    current_user: User = Depends(get_current_active_user)
):
    """List all Docker containers (requires authentication)."""
    try:
        containers = docker_manager.list_containers(all_containers=all_containers)
        return ContainerListResponse(
            containers=[ContainerInfo(**c) for c in containers],
            total=len(containers)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{container_id}/start")
def start_container(
    container_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Start a stopped container (requires authentication)."""
    try:
        docker_manager.start_container(container_id)
        return {"message": f"Container {container_id} started successfully", "success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{container_id}/stop")
def stop_container(
    container_id: str,
    timeout: int = Query(10, description="Timeout in seconds before force kill"),
    current_user: User = Depends(get_current_active_user)
):
    """Stop a running container (requires authentication)."""
    try:
        docker_manager.stop_container(container_id, timeout=timeout)
        return {"message": f"Container {container_id} stopped successfully", "success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{container_id}/restart")
def restart_container(
    container_id: str,
    timeout: int = Query(10, description="Timeout in seconds before force kill"),
    current_user: User = Depends(get_current_active_user)
):
    """Restart a container (requires authentication)."""
    try:
        docker_manager.restart_container(container_id, timeout=timeout)
        return {"message": f"Container {container_id} restarted successfully", "success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{container_id}")
def remove_container(
    container_id: str,
    force: bool = Query(False, description="Force remove even if running"),
    current_user: User = Depends(get_current_active_user)
):
    """Remove a container (requires authentication)."""
    try:
        docker_manager.remove_container(container_id, force=force)
        return {"message": f"Container {container_id} removed successfully", "success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{container_id}/logs", response_model=LogsResponse)
def get_container_logs(
    container_id: str,
    tail: int = Query(100, description="Number of lines to return"),
    current_user: User = Depends(get_current_active_user)
):
    """Get container logs (requires authentication)."""
    try:
        logs = docker_manager.get_container_logs(container_id, tail=tail)
        return LogsResponse(container_id=container_id, logs=logs)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/images/list", response_model=ImageListResponse)
def list_images(current_user: User = Depends(get_current_active_user)):
    """List all Docker images (requires authentication)."""
    try:
        images = docker_manager.list_images()
        return ImageListResponse(
            images=[ImageInfo(**img) for img in images],
            total=len(images)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/images/pull")
def pull_image(
    request: PullImageRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Pull an image from registry (requires authentication)."""
    try:
        result = docker_manager.pull_image(request.image_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

