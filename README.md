# System Monitoring Dashboard

A comprehensive real-time system monitoring dashboard for NVIDIA Spark systems, accessible via Tailscale VPN. This dashboard provides live visualization of system resources including CPU, Memory, Disk, Network, and GPU metrics, along with advanced process management capabilities.

## Features

### Real-time Monitoring
- **Live System Metrics**: Real-time monitoring with 2-second update intervals
- **CPU Metrics**: Overall usage, per-core statistics, and frequency monitoring
- **Memory Metrics**: Total, used, available, and free memory tracking
- **Disk Metrics**: Storage usage and capacity monitoring
- **Network I/O**: Real-time network traffic statistics (bytes sent/received, packets)
- **GPU Metrics**: NVIDIA GPU utilization, temperature, memory usage, and power draw (when available)

### Process Management (Authentication Required)
- **Process List**: View all running processes on the host system
- **Real-time Updates**: Auto-refresh every 5 seconds (with pause/resume control)
- **Search & Filter**: 
  - Search by process name, username, PID, or status
  - Filter by CPU usage (high CPU >1%), memory usage (high memory >1%), or status (running/sleeping)
- **Process Control**: Kill processes with confirmation dialogs
- **Process Priority**: Set process priority levels (-20 to 19)
- **Host Process Access**: Backend configured to access all host system processes

### Authentication & Security
- **User Registration**: Public registration endpoint for creating accounts
- **JWT Authentication**: Secure token-based authentication
- **Protected Endpoints**: Process management and historical data require authentication
- **Session Management**: Persistent sessions with automatic token refresh

### Historical Data (Authentication Required)
- **Metrics History**: Query historical system metrics by time range
- **Process History**: View process execution history and lifecycle

### User Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Clean Dashboard**: Text-based metrics display with real-time updates
- **Process Management UI**: Table view with sorting, search, and filtering
- **Pause/Resume**: Control auto-refresh for process list
- **Error Handling**: Graceful error messages and loading states

## Architecture

- **Frontend**: Next.js 14 with React 18, TypeScript, Tailwind CSS, and shadcn/ui components
- **Backend**: FastAPI (Python 3.11) with real-time metrics collection using psutil and pynvml
- **Database**: PostgreSQL 15 for historical data storage
- **Reverse Proxy**: Nginx for serving frontend and proxying API requests
- **Deployment**: Docker Compose with auto-restart policies for 24/7 availability
- **Process Access**: Backend uses host PID namespace to access all system processes

## Prerequisites

### For NVIDIA Spark Setup

1. **Operating System**: Ubuntu 20.04+ or similar Linux distribution
2. **Docker & Docker Compose**: 
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose
   sudo systemctl enable docker
   sudo systemctl start docker
   ```
3. **Tailscale VPN**: 
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```
4. **NVIDIA GPU Drivers** (for GPU metrics):
   ```bash
   # Verify drivers are installed
   nvidia-smi
   ```
5. **Network Access**: Ports 80, 3000, 8000, and 5432 should be available

## Quick Start on New NVIDIA Spark

### 1. Clone the Repository

```bash
git clone https://github.com/Hilo-Hilo/nvidia-spark-monitoring.git
cd nvidia-spark-monitoring
```

### 2. Configure Environment Variables (Optional)

Create a `.env` file in the project root for custom configuration:

```bash
# Backend Configuration
SECRET_KEY=your-secret-key-here-change-in-production
METRICS_COLLECTION_INTERVAL=2
HISTORICAL_DATA_RETENTION_DAYS=30
```

Or use the default values (not recommended for production).

### 3. Start All Services

```bash
# Build and start all containers
sudo docker compose up -d --build

# Check service status
sudo docker compose ps

# View logs if needed
sudo docker compose logs -f
```

### 4. Verify Services are Running

```bash
# Check backend health
curl http://localhost:8000/health

# Check frontend
curl http://localhost:3000

# Check nginx
curl http://localhost/health
```

### 5. Access the Dashboard

1. **Get your Tailscale IP**:
   ```bash
   tailscale ip
   ```

2. **Access the dashboard**:
   - Open your browser and navigate to `http://[your-tailscale-ip]`
   - Or use `http://localhost` if accessing from the server itself
   - The dashboard will be accessible from any device on your Tailscale network

### 6. Create Your First Account

1. Navigate to the login page: `http://[tailscale-ip]/login`
2. Click "Register here" at the bottom
3. Fill in:
   - Username
   - Email
   - Password (minimum 6 characters)
4. You'll be automatically logged in after registration

## Configuration

### Docker Compose Services

The `docker-compose.yml` file configures:

- **PostgreSQL Database** (port 5432): Stores user accounts and historical metrics
- **FastAPI Backend** (port 8000): API server with host process access (`pid: "host"`)
- **Next.js Frontend** (port 3000): React-based dashboard
- **Nginx Reverse Proxy** (port 80): Routes requests and serves frontend

All services are configured with `restart: unless-stopped` for 24/7 availability.

### Backend Environment Variables

**Default values** (can be overridden with `.env` file):

- `DATABASE_URL`: `postgresql://postgres:postgres@db:5432/monitoring`
- `SECRET_KEY`: `change-me-in-production` (⚠️ **Change this in production!**)
- `CORS_ORIGINS`: `["*"]` (allows all origins - fine for Tailscale network)
- `METRICS_COLLECTION_INTERVAL`: `2` (seconds between metric collections)
- `HISTORICAL_DATA_RETENTION_DAYS`: `30` (days to keep historical data)

### Frontend Configuration

The frontend automatically detects the API URL based on the current hostname. No configuration needed when accessing through nginx.

## API Endpoints

### Public Endpoints (No Authentication Required)

- `GET /health` - Health check endpoint
- `GET /api/v1/metrics/current` - Get current system metrics (all resources)
- `GET /api/v1/metrics/cpu` - Get CPU metrics
- `GET /api/v1/metrics/memory` - Get memory metrics
- `GET /api/v1/metrics/disk` - Get disk metrics
- `GET /api/v1/metrics/network` - Get network metrics
- `GET /api/v1/metrics/gpu` - Get GPU metrics (returns empty array if no GPUs)

### Authentication Endpoints

- `POST /api/v1/auth/register` - Register a new user
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string"
  }
  ```
- `POST /api/v1/auth/login` - Login and get access token
  ```
  Content-Type: application/x-www-form-urlencoded
  username=string&password=string
  ```
  Returns: `{"access_token": "jwt-token", "token_type": "bearer"}`
- `GET /api/v1/auth/me` - Get current user info (requires authentication)

### Protected Endpoints (Authentication Required)

**Process Management:**
- `GET /api/v1/processes/` - Get all running processes
  - Returns: `{"processes": [...], "total": number}`
- `POST /api/v1/processes/{pid}/kill` - Kill a process by PID
- `POST /api/v1/processes/{pid}/priority?priority={-20..19}` - Set process priority

**Historical Data:**
- `GET /api/v1/history/metrics?start_time={ISO8601}&end_time={ISO8601}&metric_type={optional}&limit={optional}` - Get historical metrics
- `GET /api/v1/history/processes?start_time={ISO8601}&end_time={ISO8601}&limit={optional}` - Get process history

**Authentication:** Include header: `Authorization: Bearer <token>`

## Usage Guide

### Viewing System Metrics

1. Navigate to the dashboard homepage
2. View real-time metrics that update every 2 seconds:
   - CPU usage percentage and core count
   - Memory usage with total/used/available breakdown
   - Disk usage with total/used/free capacity
   - Network I/O statistics
   - GPU metrics (if NVIDIA GPUs are available)

### Managing Processes

1. **Login**: Navigate to `/login` and authenticate
2. **Access Processes**: Click "Processes" in the navigation header
3. **View Processes**: See all running processes with:
   - PID, Name, User, CPU%, Memory%, Status
   - Kill button for each process
4. **Search**: Type in the search bar to filter by name, user, PID, or status
5. **Filter**: Use the dropdown to filter by:
   - All Processes
   - High CPU (>1%)
   - High Memory (>1%)
   - Running status
   - Sleeping status
6. **Pause/Resume**: Click the pause button to stop auto-refresh, resume to continue
7. **Kill Process**: Click "Kill" button and confirm to terminate a process

### Viewing Historical Data

1. Log in to access historical endpoints
2. Use the API endpoints with time range queries
3. Historical data is automatically collected every 2 seconds

## Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000` and proxy API requests to the backend.

## Troubleshooting

### Services Not Starting

```bash
# Check service status
sudo docker compose ps

# View logs for specific service
sudo docker compose logs backend
sudo docker compose logs frontend
sudo docker compose logs db
sudo docker compose logs nginx

# Restart a specific service
sudo docker compose restart backend

# Rebuild and restart
sudo docker compose up -d --build
```

**Common Issues:**
- **Port conflicts**: Ensure ports 80, 3000, 8000, and 5432 are not in use
- **Permission errors**: Use `sudo` for docker commands if needed
- **Build failures**: Check Docker logs for specific error messages

### Cannot Access via Tailscale

1. **Verify Tailscale is running**:
   ```bash
   sudo systemctl status tailscaled
   tailscale status
   ```

2. **Get Tailscale IP**:
   ```bash
   tailscale ip
   ```

3. **Check firewall**:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw status
   ```

4. **Verify network connectivity**:
   ```bash
   # From another device on Tailscale network
   ping [tailscale-ip]
   curl http://[tailscale-ip]/health
   ```

### Process List Shows Only 1 Process

The backend container uses `pid: "host"` to access host processes. If you only see the uvicorn process:

1. **Verify docker-compose.yml** has `pid: "host"` under backend service
2. **Restart backend**:
   ```bash
   sudo docker compose restart backend
   ```

### GPU Metrics Not Showing

1. **Verify NVIDIA drivers**:
   ```bash
   nvidia-smi
   ```

2. **Test pynvml access**:
   ```bash
   sudo docker exec monitoring_backend python -c "import pynvml; pynvml.nvmlInit(); print('GPU access OK')"
   ```

3. **Check if GPUs are available**:
   ```bash
   curl http://localhost:8000/api/v1/metrics/gpu
   ```

**Note**: GPU metrics require NVIDIA drivers and may not be available in all environments.

### Authentication Issues

1. **Registration fails**: Check backend logs for database errors
2. **Login fails**: Verify username/password are correct
3. **Token expired**: Tokens expire after 30 minutes - log in again
4. **401 Unauthorized**: Ensure you're including the Bearer token in requests:
   ```
   Authorization: Bearer <your-token>
   ```

### Frontend Build Errors

If you encounter build errors:

1. **Clear Next.js cache**:
   ```bash
   cd frontend
   rm -rf .next
   sudo docker compose build --no-cache frontend
   ```

2. **Check for dependency issues**:
   ```bash
   sudo docker compose logs frontend | grep -i error
   ```

## Security Considerations

### Production Deployment

1. **Change SECRET_KEY**: 
   - Generate a strong secret key
   - Update in `.env` or `docker-compose.yml`
   - Never commit secrets to git

2. **Database Security**:
   - Change default PostgreSQL password
   - Use strong database credentials
   - Consider using secrets management

3. **CORS Configuration**:
   - Restrict `CORS_ORIGINS` to specific domains if needed
   - Current `["*"]` is fine for Tailscale network access

4. **User Registration**:
   - Currently public - anyone can register
   - Consider adding invite codes or admin-only registration for production

5. **HTTPS**:
   - Consider adding SSL/TLS certificates
   - Use Let's Encrypt or similar for Tailscale network

6. **Firewall**:
   - Only expose necessary ports
   - Use Tailscale ACLs to restrict access

## Maintenance

### Updating the Dashboard

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
sudo docker compose up -d --build
```

### Database Backup

```bash
# Backup database
sudo docker exec monitoring_db pg_dump -U postgres monitoring > backup.sql

# Restore database
sudo docker exec -i monitoring_db psql -U postgres monitoring < backup.sql
```

### Viewing Logs

```bash
# All services
sudo docker compose logs -f

# Specific service
sudo docker compose logs -f backend
sudo docker compose logs -f frontend

# Last 100 lines
sudo docker compose logs --tail=100 backend
```

### Cleaning Up

```bash
# Stop all services
sudo docker compose down

# Remove volumes (⚠️ deletes database data)
sudo docker compose down -v

# Remove all containers and images
sudo docker compose down --rmi all
```

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3.11, SQLAlchemy, psutil, pynvml
- **Database**: PostgreSQL 15
- **Reverse Proxy**: Nginx
- **Containerization**: Docker, Docker Compose
- **Authentication**: JWT (python-jose), bcrypt (passlib)

## License

This project is provided as-is for monitoring your NVIDIA Spark system.

## Support

For issues, questions, or contributions, please visit the GitHub repository:
https://github.com/Hilo-Hilo/nvidia-spark-monitoring
