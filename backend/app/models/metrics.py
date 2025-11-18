"""Pydantic models for API requests/responses."""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class CPUMetrics(BaseModel):
    """CPU metrics model."""
    percent: float
    count: int
    freq_current: Optional[float] = None
    per_cpu: Optional[List[float]] = None


class MemoryMetrics(BaseModel):
    """Memory metrics model."""
    total: float
    available: float
    used: float
    percent: float
    free: float


class DiskMetrics(BaseModel):
    """Disk metrics model."""
    total: float
    used: float
    free: float
    percent: float


class NetworkMetrics(BaseModel):
    """Network metrics model with live rates from system."""
    bytes_sent: float
    bytes_recv: float
    packets_sent: float
    packets_recv: float
    # Live rates calculated directly from system (bytes/second, packets/second)
    bytes_sent_rate: float = 0.0
    bytes_recv_rate: float = 0.0
    packets_sent_rate: float = 0.0
    packets_recv_rate: float = 0.0


class GPUMetrics(BaseModel):
    """GPU metrics model."""
    index: int
    name: str
    temperature: float
    utilization: float
    memory_used: float
    memory_total: float
    memory_percent: float
    power_draw: Optional[float] = None


class SystemMetrics(BaseModel):
    """Complete system metrics model."""
    timestamp: datetime
    cpu: CPUMetrics
    memory: MemoryMetrics
    disk: DiskMetrics
    network: NetworkMetrics
    gpus: List[GPUMetrics]


class ProcessInfo(BaseModel):
    """Process information model."""
    pid: int
    name: str
    username: str
    cpu_percent: float
    memory_percent: float
    status: str
    created: Optional[float] = None


class ProcessListResponse(BaseModel):
    """Process list response model."""
    processes: List[ProcessInfo]
    total: int


class HistoricalMetricsRequest(BaseModel):
    """Request model for historical metrics."""
    start_time: datetime
    end_time: datetime
    metric_type: Optional[str] = None  # cpu, memory, disk, network, gpu


class HistoricalMetricsResponse(BaseModel):
    """Historical metrics response model."""
    metrics: List[Dict[str, Any]]
    count: int

