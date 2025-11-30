# NVIDIA Spark Monitoring Dashboard

A comprehensive real-time system monitoring dashboard for NVIDIA Spark systems. This dashboard provides live visualization of system resources including CPU, Memory, Disk, Network, and GPU metrics, along with advanced process management capabilities.

## Screenshots

The dashboard provides real-time monitoring with an intuitive interface:

![Dashboard Overview](./images/1.png)

![System Information and Network Details](./images/2.png)

![Metrics Display](./images/3.png)

**Fully Generic & Deployable**: This repository contains no hardcoded values and can be deployed to any NVIDIA Spark system (or any Linux system with Docker). All configuration is done through environment variables with sensible defaults. The only file that needs path customization is the optional `system-monitoring.service` file for automatic startup.

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
- **History Page**: Interactive charts displaying historical metrics with:
  - Date range selection (presets: Last 5/10/30 Minutes, Last Hour, Last 24 Hours, Last Week, Last Month, or custom range)
  - CPU metrics charts (usage percentage and frequency)
  - Memory metrics charts (usage percentage and capacity)
  - Disk metrics charts (usage percentage and capacity)
  - Network I/O charts (bytes sent/received and packets)
  - GPU metrics charts (utilization, temperature, memory for each GPU)

### User Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Clean Dashboard**: Text-based metrics display with real-time updates
- **Process Management UI**: Table view with sorting, search, and filtering
- **History Page**: Interactive charts for visualizing historical metrics with date range selection
- **Pause/Resume**: Control auto-refresh for process list
- **Error Handling**: Graceful error messages and loading states

## Architecture

- **Frontend**: Next.js 14 with React 18, TypeScript, Tailwind CSS, and shadcn/ui components
- **Backend**: FastAPI (Python 3.11) with real-time metrics collection using psutil and pynvml
- **Database**: PostgreSQL 15 for historical data storage
- **Reverse Proxy**: Nginx for serving frontend and proxying API requests
- **Deployment**: Docker Compose with auto-restart policies for 24/7 availability
- **Process Access**: Backend uses host PID namespace to access all system processes
- **Background Services**: 
  - Metrics collection runs every 2 seconds (configurable via `METRICS_COLLECTION_INTERVAL`)
  - Data cleanup runs every 24 hours to remove old historical data
  - These services run continuously even when no clients are connected

## Prerequisites

### For NVIDIA Spark Setup

1. **Operating System**: Ubuntu 20.04+ or similar Linux distribution
2. **Docker & Docker Compose**: 
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose-plugin
   sudo systemctl enable docker
   sudo systemctl start docker
   
   # Verify installation
   docker --version
   docker compose version
   ```
   
   **Note**: This project uses Docker Compose V2 (plugin). If you have the older standalone `docker-compose` command, you can either:
   - Install the plugin: `sudo apt install docker-compose-plugin` (recommended)
   - Or use `docker-compose` (with hyphen) instead of `docker compose` (with space) in all commands
3. **Network Access**: Ports 80, 3000, 8000, and 5432 should be available
4. **NVIDIA GPU Support** (optional, for GPU metrics):
   
   a. **Install NVIDIA GPU Drivers**:
   ```bash
   # Verify drivers are installed
   nvidia-smi
   ```
   
   b. **Install NVIDIA Container Toolkit** (required for Docker GPU access):
   ```bash
   # Add NVIDIA package repository
   distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
   curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
   curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
     sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
     sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
   
   # Install the toolkit
   sudo apt-get update
   sudo apt-get install -y nvidia-container-toolkit
   
   # Restart Docker to apply changes
   sudo systemctl restart docker
   
   # Verify GPU access in Docker
   sudo docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
   ```
   
   **Note**: Without the NVIDIA Container Toolkit, Docker containers cannot access GPUs even if drivers are installed on the host.

**Note**: This dashboard can be accessed via:
- Local network (http://localhost or http://[server-ip])
- VPN (Tailscale, WireGuard, etc.)
- Public IP (with proper security configuration)
- Any network configuration you prefer

## Quick Start on New NVIDIA Spark

**Complete Setup Checklist:**
1. ✅ Install Docker and Docker Compose
2. ✅ Clone the repository
3. ✅ Create `.env` file in project root (optional but recommended)
4. ✅ Build and start services
5. ✅ (Optional) Set up systemd service for auto-start
6. ✅ Access dashboard and create account

**Important File Locations:**
- `.env` file: **Project root** (same directory as `docker-compose.yml`)
- `docker-compose.yml`: **Project root**
- `system-monitoring.service`: **Project root** (edit before installing)
- All other files: Follow the repository structure

---

### 1. Clone the Repository

```bash
git clone https://github.com/Hilo-Hilo/nvidia-spark-monitoring.git
cd nvidia-spark-monitoring
```

### 2. Configure Environment Variables (Recommended)

**Location**: The `.env` file must be created in the **project root directory** (same directory as `docker-compose.yml`).

```bash
# Navigate to project root (if not already there)
cd nvidia-spark-monitoring

# Copy the example file to create your .env file
cp .env.example .env

# Edit with your preferred values
nano .env
# Or use your preferred editor: vim, code, etc.
```

**Important**: At minimum, change the `SECRET_KEY` to a strong random value for production use.

**Generate a secure SECRET_KEY**:
```bash
# Option 1: Using openssl
openssl rand -hex 32

# Option 2: Using Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Example `.env` file** (located at project root: `nvidia-spark-monitoring/.env`):
```bash
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password-here
POSTGRES_DB=monitoring

# Backend Configuration
SECRET_KEY=your-generated-secret-key-here-minimum-32-characters
CORS_ORIGINS=["*"]
METRICS_COLLECTION_INTERVAL=2
HISTORICAL_DATA_RETENTION_DAYS=30
```

**Notes**: 
- The `.env` file is **gitignored** and will not be committed to version control
- All values have sensible defaults and the system will work without a `.env` file
- It's **strongly recommended** to set your own `SECRET_KEY` and database password for production
- If you don't create a `.env` file, the system will use defaults from `docker-compose.yml` and `backend/app/config.py`
- Docker Compose automatically reads the `.env` file from the project root when you run `docker compose` commands

### 3. Start All Services

**Important**: Make sure you're in the project root directory (where `docker-compose.yml` is located).

```bash
# Verify you're in the right directory
ls -la | grep docker-compose.yml  # Should show the file

# Build and start all containers
sudo docker compose up -d --build

# Check service status (all should show "Up" and "healthy")
sudo docker compose ps

# View logs if needed (press Ctrl+C to exit)
sudo docker compose logs -f

# View logs for a specific service
sudo docker compose logs -f backend
sudo docker compose logs -f frontend
sudo docker compose logs -f db
```

**Expected Output**: You should see 4 services running:
- `monitoring_db` (PostgreSQL)
- `monitoring_backend` (FastAPI)
- `monitoring_frontend` (Next.js)
- `monitoring_nginx` (Nginx reverse proxy)

### 4. Verify Services are Running

```bash
# Check backend health
curl http://localhost:8000/health

# Check frontend
curl http://localhost:3000

# Check nginx
curl http://localhost/health
```

### 5. (Optional) Set Up Automatic Startup on Boot

To ensure the monitoring dashboard automatically starts after system reboots:

1. **Edit the systemd service file** with your project path:
   ```bash
   # Edit the service file
   nano system-monitoring.service
   
   # Replace /path/to/nvidia-spark-monitoring with your actual project path
   # For example: /home/username/nvidia-spark-monitoring
   ```

2. **Install and enable the service**:
   ```bash
   # Copy service file to systemd directory
   sudo cp system-monitoring.service /etc/systemd/system/
   
   # Reload systemd
   sudo systemctl daemon-reload
   
   # Enable service to start on boot
   sudo systemctl enable system-monitoring.service
   
   # Start the service now (optional)
   sudo systemctl start system-monitoring.service
   
   # Check status
   sudo systemctl status system-monitoring.service
   ```

3. **Verify it works**:
   ```bash
   # After a reboot, check if services are running
   sudo docker compose ps
   ```

**Note**: The systemd service ensures your monitoring dashboard automatically restarts after system reboots, including when you use the "Restart System" button in the dashboard.

### 6. Access the Dashboard

1. **Get your server IP** (choose one method):
   ```bash
   # If using Tailscale
   tailscale ip
   
   # Or get local network IP
   hostname -I | awk '{print $1}'
   
   # Or use localhost if accessing from the server itself
   ```

2. **Access the dashboard**:
   - Open your browser and navigate to `http://[your-server-ip]` or `http://localhost`
   - The dashboard will be accessible from any device on your network
   - For Tailscale users: accessible from any device on your Tailscale network
   - For local network: accessible from any device on the same network

### 7. Create Your First Account

1. Navigate to the login page: `http://[your-server-ip]/login` or `http://localhost/login`
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
- **FastAPI Backend** (port 8000): API server with host process access (`pid: "host"`) and NVIDIA GPU access
- **Next.js Frontend** (port 3000): React-based dashboard
- **Nginx Reverse Proxy** (port 80): Routes requests and serves frontend

All services are configured with `restart: unless-stopped` for 24/7 availability.

**GPU Configuration**: The backend container is configured with NVIDIA GPU access using the `deploy.resources.reservations.devices` section. This enables GPU metrics collection for systems with NVIDIA GPUs. On systems without GPUs, the dashboard will simply not display GPU metrics.

### Environment Variables

All configuration is done through environment variables with sensible defaults. Create a `.env` file in the project root to override defaults.

**Database Configuration:**
- `POSTGRES_USER`: Database username (default: `postgres`)
- `POSTGRES_PASSWORD`: Database password (default: `postgres`) ⚠️ **Change in production!**
- `POSTGRES_DB`: Database name (default: `monitoring`)

**Backend Configuration:**
- `SECRET_KEY`: JWT secret key (default: `change-me-in-production`) ⚠️ **Must change in production!**
  - Generate with: `openssl rand -hex 32` or `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`
- `CORS_ORIGINS`: Allowed CORS origins (default: `["*"]` - fine for private networks)
- `METRICS_COLLECTION_INTERVAL`: Seconds between metric collections (default: `2`)
  - Lower values = more granular data but higher resource usage
  - Higher values = less resource usage but less detailed historical data
  - Background collection runs continuously even without client connections
- `HISTORICAL_DATA_RETENTION_DAYS`: Days to keep historical data (default: `30`)
  - Old data is automatically cleaned up daily

**Frontend Configuration:**
- `NEXT_PUBLIC_API_URL`: Backend API URL (auto-detected, usually not needed)

**Creating `.env` file**:
- **Location**: Must be in the **project root directory** (same level as `docker-compose.yml`)
- **Method 1**: Copy from `.env.example`: `cp .env.example .env`
- **Method 2**: Create manually: `nano .env` (or your preferred editor)
- The `.env` file is gitignored and will not be committed
- Docker Compose automatically loads variables from `.env` in the project root

**Note**: The example values in `.env.example` are the same as the defaults, so creating a `.env` file is optional unless you want to customize settings. However, **you should always set a custom `SECRET_KEY` for production use**.

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

1. **Login**: Navigate to `/login` and authenticate
2. **Access History**: Click "History" in the navigation header
3. **Select Time Range**: 
   - Use quick presets (Last 5 Minutes, Last 10 Minutes, Last 30 Minutes, Last Hour, Last 24 Hours, Last Week, Last Month)
   - Or select "Custom Range" to specify exact start and end times
4. **View Charts**: The page displays interactive charts for:
   - **CPU Metrics**: CPU usage percentage and frequency over time
   - **Memory Metrics**: Memory usage percentage and capacity (used/available)
   - **Disk Metrics**: Disk usage percentage and capacity (used/free)
   - **Network I/O**: Network traffic (bytes sent/received) and packet counts
   - **GPU Metrics**: GPU utilization, temperature, and memory usage for each GPU
5. **Data Collection**: Historical data is automatically collected every 2 seconds and stored in the database
6. **API Access**: You can also access historical data programmatically via the API endpoints with time range queries

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

### .env File Location Issues

**Problem**: Environment variables not being read, or services using default values.

**Solution**:
1. **Verify `.env` file location**:
   ```bash
   # From project root, check if .env exists
   ls -la .env
   
   # Should show: -rw-r--r-- 1 user user ... .env
   # If not found, create it:
   cp .env.example .env
   ```

2. **Verify you're in the project root**:
   ```bash
   # Should show docker-compose.yml
   ls docker-compose.yml
   
   # If not, navigate to project root:
   cd /path/to/nvidia-spark-monitoring
   ```

3. **Check if Docker Compose is reading the file**:
   ```bash
   # Test by setting a variable and checking
   echo "TEST_VAR=test123" >> .env
   sudo docker compose config | grep TEST_VAR
   # Should show the variable
   ```

4. **Common mistakes**:
   - ❌ `.env` file in `backend/` directory (wrong location)
   - ❌ `.env` file named `.env.example` (needs to be `.env`)
   - ❌ Missing quotes around JSON values: `CORS_ORIGINS=["*"]` (correct) vs `CORS_ORIGINS=[*]` (wrong)

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

GPU metrics require both NVIDIA drivers on the host and proper GPU access configuration in Docker.

1. **Verify NVIDIA drivers are installed on the host**:
   ```bash
   nvidia-smi
   ```
   If this command fails, install NVIDIA drivers first.

2. **Verify docker-compose.yml has GPU configuration**:
   The backend service should include:
   ```yaml
   deploy:
     resources:
       reservations:
         devices:
           - driver: nvidia
             count: all
             capabilities: [gpu]
   ```

3. **Restart backend container after adding GPU config**:
   ```bash
   sudo docker compose up -d backend
   ```

4. **Test pynvml access inside container**:
   ```bash
   sudo docker exec monitoring_backend python -c "import pynvml; pynvml.nvmlInit(); print('GPU access OK')"
   ```
   If this fails with "NVML Shared Library Not Found", the container doesn't have GPU access.

5. **Check if GPUs are available via API**:
   ```bash
   curl http://localhost:8000/api/v1/metrics/gpu
   ```
   Should return GPU data instead of an empty array `[]`.

**Common Issues:**
- **Missing GPU configuration in docker-compose.yml**: The `deploy.resources.reservations.devices` section is required for Docker containers to access GPUs
- **NVIDIA Container Toolkit not installed**: Install with `sudo apt-get install -y nvidia-container-toolkit && sudo systemctl restart docker`
- **Docker Compose version too old**: GPU support requires Docker Compose V2 (plugin version). Update if using standalone docker-compose.

### Authentication Issues

1. **Registration fails**: Check backend logs for database errors
2. **Login fails**: Verify username/password are correct
3. **Token expired**: Tokens expire after 7 days - log in again
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
