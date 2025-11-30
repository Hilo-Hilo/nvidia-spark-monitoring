"""Systemd service management endpoints (authentication required)."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Dict, Any
from app.models.database import User
from app.auth import get_current_active_user
from app.services.systemd_manager import systemd_manager

router = APIRouter()


class ServiceInfo(BaseModel):
    """Service information model."""
    name: str
    description: str
    load_state: str
    active_state: str
    sub_state: str
    enabled: bool


class ServiceListResponse(BaseModel):
    """Response model for service list."""
    services: List[ServiceInfo]
    total: int


class LogsResponse(BaseModel):
    """Response model for service logs."""
    service_name: str
    logs: str


@router.get("/", response_model=ServiceListResponse)
def list_services(current_user: User = Depends(get_current_active_user)):
    """List all systemd services (requires authentication)."""
    try:
        services = systemd_manager.list_services()
        return ServiceListResponse(
            services=[ServiceInfo(**s) for s in services],
            total=len(services)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{service_name}/start")
def start_service(
    service_name: str,
    current_user: User = Depends(get_current_active_user)
):
    """Start a service (requires authentication)."""
    try:
        systemd_manager.start_service(service_name)
        return {"message": f"Service {service_name} started successfully", "success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{service_name}/stop")
def stop_service(
    service_name: str,
    current_user: User = Depends(get_current_active_user)
):
    """Stop a service (requires authentication)."""
    try:
        systemd_manager.stop_service(service_name)
        return {"message": f"Service {service_name} stopped successfully", "success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{service_name}/restart")
def restart_service(
    service_name: str,
    current_user: User = Depends(get_current_active_user)
):
    """Restart a service (requires authentication)."""
    try:
        systemd_manager.restart_service(service_name)
        return {"message": f"Service {service_name} restarted successfully", "success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{service_name}/enable")
def enable_service(
    service_name: str,
    current_user: User = Depends(get_current_active_user)
):
    """Enable a service to start on boot (requires authentication)."""
    try:
        systemd_manager.enable_service(service_name)
        return {"message": f"Service {service_name} enabled successfully", "success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{service_name}/disable")
def disable_service(
    service_name: str,
    current_user: User = Depends(get_current_active_user)
):
    """Disable a service from starting on boot (requires authentication)."""
    try:
        systemd_manager.disable_service(service_name)
        return {"message": f"Service {service_name} disabled successfully", "success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{service_name}/logs", response_model=LogsResponse)
def get_service_logs(
    service_name: str,
    lines: int = Query(100, description="Number of lines to return"),
    current_user: User = Depends(get_current_active_user)
):
    """Get service logs from journalctl (requires authentication)."""
    try:
        logs = systemd_manager.get_service_logs(service_name, lines=lines)
        return LogsResponse(service_name=service_name, logs=logs)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

