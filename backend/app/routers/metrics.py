"""Real-time metrics endpoints (public)."""
from fastapi import APIRouter
from app.services.system_monitor import system_monitor
from app.models.metrics import SystemMetrics

router = APIRouter()


@router.get("/current", response_model=SystemMetrics)
async def get_current_metrics():
    """Get current system metrics (public endpoint)."""
    return system_monitor.get_all_metrics()


@router.get("/cpu")
async def get_cpu_metrics():
    """Get CPU metrics only."""
    return system_monitor.get_cpu_metrics()


@router.get("/memory")
async def get_memory_metrics():
    """Get memory metrics only."""
    return system_monitor.get_memory_metrics()


@router.get("/disk")
async def get_disk_metrics():
    """Get disk metrics only."""
    return system_monitor.get_disk_metrics()


@router.get("/network")
async def get_network_metrics():
    """Get network metrics with live rates calculated directly from system."""
    return system_monitor.get_network_metrics()


@router.get("/network/pernic")
async def get_network_metrics_pernic():
    """Get per-interface network metrics with rates."""
    return system_monitor.get_network_metrics_pernic()


@router.get("/gpu")
async def get_gpu_metrics():
    """Get GPU metrics only."""
    return system_monitor.get_gpu_metrics()

