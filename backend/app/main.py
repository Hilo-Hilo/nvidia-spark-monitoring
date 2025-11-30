"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from app.config import settings
from app.database import engine, Base
from app.routers import metrics, processes, history, auth, containers, services
from app.services.data_collector import data_collector

# Create database tables
Base.metadata.create_all(bind=engine)

# Background scheduler for data collection
scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown."""
    # Startup
    scheduler.add_job(
        data_collector.collect_and_store,
        'interval',
        seconds=settings.METRICS_COLLECTION_INTERVAL,
        id='collect_metrics'
    )
    scheduler.add_job(
        data_collector.cleanup_old_data,
        'interval',
        hours=24,
        id='cleanup_data',
        kwargs={'retention_days': settings.HISTORICAL_DATA_RETENTION_DAYS}
    )
    scheduler.start()
    yield
    # Shutdown
    scheduler.shutdown()


app = FastAPI(
    title="System Monitoring Dashboard API",
    description="API for monitoring NVIDIA Spark system resources",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(metrics.router, prefix=f"{settings.API_V1_PREFIX}/metrics", tags=["metrics"])
app.include_router(processes.router, prefix=f"{settings.API_V1_PREFIX}/processes", tags=["processes"])
app.include_router(history.router, prefix=f"{settings.API_V1_PREFIX}/history", tags=["history"])
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["auth"])
app.include_router(containers.router, prefix=f"{settings.API_V1_PREFIX}/containers", tags=["containers"])
app.include_router(services.router, prefix=f"{settings.API_V1_PREFIX}/services", tags=["services"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "System Monitoring Dashboard API", "version": "1.0.0"}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}

