FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (including D-Bus for systemd integration)
RUN apt-get update && apt-get install -y \
    gcc \
    util-linux \
    curl \
    libdbus-1-dev \
    libdbus-glib-1-dev \
    pkg-config \
    systemd \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

