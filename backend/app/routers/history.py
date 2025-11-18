"""Historical data endpoints (authentication required)."""
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.database import get_db
from app.models.database import User, MetricSnapshot
from app.auth import get_current_active_user
from app.models.metrics import HistoricalMetricsRequest, HistoricalMetricsResponse
import json
from collections import defaultdict
from typing import Optional

router = APIRouter()


def round_metric_value(value: Optional[float], decimal_places: int = 2) -> Optional[float]:
    """
    Round a metric value to specified decimal places.
    Returns None if value is None, otherwise returns rounded value.
    """
    if value is None:
        return None
    return round(value, decimal_places)


def aggregate_metrics(snapshots, time_range_hours):
    """Aggregate metrics by time buckets based on time range."""
    if time_range_hours <= 1:
        # No aggregation for < 1 hour
        return snapshots
    elif time_range_hours <= 24:
        # Aggregate by minute for < 24 hours
        bucket_minutes = max(1, int(time_range_hours * 60 / 500))  # Target ~500 points
    elif time_range_hours <= 168:  # 1 week
        # Aggregate by hour for < 1 week
        bucket_minutes = 60
    else:
        # Aggregate by day for > 1 week
        bucket_minutes = 1440
    
    # Group by time buckets
    buckets = defaultdict(list)
    for snapshot in snapshots:
        # Round timestamp to bucket
        timestamp = snapshot.timestamp
        total_minutes = int(timestamp.timestamp() / 60)
        bucket_minutes_rounded = (total_minutes // bucket_minutes) * bucket_minutes
        bucket_key = datetime.fromtimestamp(bucket_minutes_rounded * 60)
        buckets[bucket_key].append(snapshot)
    
    # Aggregate each bucket
    aggregated = []
    for bucket_time in sorted(buckets.keys()):
        bucket_snapshots = buckets[bucket_time]
        if not bucket_snapshots:
            continue
        
        # Calculate averages
        count = len(bucket_snapshots)
        cpu_percents = [s.cpu_percent for s in bucket_snapshots if s.cpu_percent is not None]
        cpu_freqs = [s.cpu_freq_current for s in bucket_snapshots if s.cpu_freq_current is not None]
        memory_percents = [s.memory_percent for s in bucket_snapshots if s.memory_percent is not None]
        memory_useds = [s.memory_used for s in bucket_snapshots if s.memory_used is not None]
        memory_availables = [s.memory_available for s in bucket_snapshots if s.memory_available is not None]
        disk_percents = [s.disk_percent for s in bucket_snapshots if s.disk_percent is not None]
        disk_useds = [s.disk_used for s in bucket_snapshots if s.disk_used is not None]
        network_bytes_sent = [s.network_bytes_sent for s in bucket_snapshots if s.network_bytes_sent is not None]
        network_bytes_recv = [s.network_bytes_recv for s in bucket_snapshots if s.network_bytes_recv is not None]
        network_packets_sent = [s.network_packets_sent for s in bucket_snapshots if s.network_packets_sent is not None]
        network_packets_recv = [s.network_packets_recv for s in bucket_snapshots if s.network_packets_recv is not None]
        
        # Use first snapshot for non-averaged values
        first = bucket_snapshots[0]
        
        # Create aggregated snapshot with rounded values
        agg_snapshot = MetricSnapshot(
            timestamp=bucket_time,
            cpu_percent=round_metric_value(sum(cpu_percents) / len(cpu_percents) if cpu_percents else None, 2),
            cpu_count=first.cpu_count,
            cpu_freq_current=round_metric_value(sum(cpu_freqs) / len(cpu_freqs) if cpu_freqs else None, 2),
            memory_total=round_metric_value(first.memory_total, 0),
            memory_available=round_metric_value(sum(memory_availables) / len(memory_availables) if memory_availables else None, 0),
            memory_percent=round_metric_value(sum(memory_percents) / len(memory_percents) if memory_percents else None, 2),
            memory_used=round_metric_value(sum(memory_useds) / len(memory_useds) if memory_useds else None, 0),
            disk_total=round_metric_value(first.disk_total, 0),
            disk_used=round_metric_value(sum(disk_useds) / len(disk_useds) if disk_useds else None, 0),
            disk_free=round_metric_value(first.disk_free, 0),
            disk_percent=round_metric_value(sum(disk_percents) / len(disk_percents) if disk_percents else None, 2),
            network_bytes_sent=round_metric_value(sum(network_bytes_sent) / len(network_bytes_sent) if network_bytes_sent else None, 0),
            network_bytes_recv=round_metric_value(sum(network_bytes_recv) / len(network_bytes_recv) if network_bytes_recv else None, 0),
            network_packets_sent=round_metric_value(sum(network_packets_sent) / len(network_packets_sent) if network_packets_sent else None, 0),
            network_packets_recv=round_metric_value(sum(network_packets_recv) / len(network_packets_recv) if network_packets_recv else None, 0),
            gpu_data=first.gpu_data  # Use first GPU data (could aggregate this too)
        )
        aggregated.append(agg_snapshot)
    
    return aggregated


@router.get("/metrics", response_model=HistoricalMetricsResponse)
async def get_historical_metrics(
    start_time: datetime = Query(...),
    end_time: datetime = Query(...),
    metric_type: str = Query(None),
    limit: int = Query(10000, le=50000),
    aggregate: bool = Query(True),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get historical metrics (requires authentication)."""
    # Calculate time range
    time_range = (end_time - start_time).total_seconds() / 3600  # hours
    
    # Query all snapshots in range (no limit if aggregating)
    query = db.query(MetricSnapshot).filter(
        and_(
            MetricSnapshot.timestamp >= start_time,
            MetricSnapshot.timestamp <= end_time
        )
    ).order_by(MetricSnapshot.timestamp.asc())
    
    if not aggregate:
        query = query.limit(limit)
    
    snapshots = query.all()
    
    # Aggregate if requested and time range is large
    if aggregate and time_range > 1 and len(snapshots) > 500:
        snapshots = aggregate_metrics(snapshots, time_range)
    
    metrics = []
    for snapshot in snapshots:
        metric_data = {
            "timestamp": snapshot.timestamp.isoformat(),
            "cpu": {
                "percent": round_metric_value(snapshot.cpu_percent, 2),
                "count": snapshot.cpu_count,
                "freq_current": round_metric_value(snapshot.cpu_freq_current, 2)
            },
            "memory": {
                "total": round_metric_value(snapshot.memory_total, 0),
                "available": round_metric_value(snapshot.memory_available, 0),
                "used": round_metric_value(snapshot.memory_used, 0),
                "percent": round_metric_value(snapshot.memory_percent, 2)
            },
            "disk": {
                "total": round_metric_value(snapshot.disk_total, 0),
                "used": round_metric_value(snapshot.disk_used, 0),
                "free": round_metric_value(snapshot.disk_free, 0),
                "percent": round_metric_value(snapshot.disk_percent, 2)
            },
            "network": {
                "bytes_sent": round_metric_value(snapshot.network_bytes_sent, 0),
                "bytes_recv": round_metric_value(snapshot.network_bytes_recv, 0),
                "packets_sent": round_metric_value(snapshot.network_packets_sent, 0),
                "packets_recv": round_metric_value(snapshot.network_packets_recv, 0)
            }
        }
        
        if snapshot.gpu_data:
            try:
                metric_data["gpu"] = json.loads(snapshot.gpu_data)
            except:
                metric_data["gpu"] = []
        
        # Filter by metric type if specified
        if metric_type:
            if metric_type in metric_data:
                metric_data = {metric_type: metric_data[metric_type], "timestamp": metric_data["timestamp"]}
            else:
                continue
        
        metrics.append(metric_data)
    
    return HistoricalMetricsResponse(metrics=metrics, count=len(metrics))


@router.get("/processes")
async def get_process_history(
    start_time: datetime = Query(...),
    end_time: datetime = Query(...),
    limit: int = Query(1000, le=10000),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get process execution history (requires authentication)."""
    from app.models.database import ProcessHistory
    
    query = db.query(ProcessHistory).filter(
        and_(
            ProcessHistory.created_at >= start_time,
            ProcessHistory.created_at <= end_time
        )
    ).order_by(ProcessHistory.created_at.desc()).limit(limit)
    
    processes = query.all()
    
    return {
        "processes": [
            {
                "id": p.id,
                "pid": p.pid,
                "name": p.name,
                "username": p.username,
                "cpu_percent": p.cpu_percent,
                "memory_percent": p.memory_percent,
                "status": p.status,
                "started_at": p.started_at.isoformat() if p.started_at else None,
                "ended_at": p.ended_at.isoformat() if p.ended_at else None,
                "created_at": p.created_at.isoformat()
            }
            for p in processes
        ],
        "count": len(processes)
    }

