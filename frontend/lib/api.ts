import axios from 'axios';
import { auth } from './auth';

const getBrowserBaseUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:8000/api/v1';
  }

  const { protocol, hostname, port } = window.location;

  // When accessing the Next.js container directly (port 3000),
  // proxying through nginx is not available, so hit the backend port.
  if (port === '3000') {
    return `${protocol}//${hostname}:8000/api/v1`;
  }

  const normalizedPort = port && port !== '' ? `:${port}` : '';
  return `${protocol}//${hostname}${normalizedPort}/api/v1`;
};

const apiClient = axios.create({
  baseURL: getBrowserBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = auth.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export interface SystemMetrics {
  timestamp: string;
  cpu: {
    percent: number;
    count: number;
    freq_current?: number;
    per_cpu?: number[];
  };
  memory: {
    total: number;
    available: number;
    used: number;
    percent: number;
    free: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  network: {
    bytes_sent: number;
    bytes_recv: number;
    packets_sent: number;
    packets_recv: number;
    bytes_sent_rate: number;
    bytes_recv_rate: number;
    packets_sent_rate: number;
    packets_recv_rate: number;
  };
  gpus: Array<{
    index: number;
    name: string;
    temperature: number;
    utilization: number;
    memory_used: number;
    memory_total: number;
    memory_percent: number;
    power_draw?: number;
  }>;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  username: string;
  cpu_percent: number;
  memory_percent: number;
  status: string;
  created?: number;
}

export const api = {
  // Public endpoints (no auth required)
  metrics: {
    getCurrent: () => apiClient.get<SystemMetrics>('/metrics/current'),
    getCPU: () => apiClient.get('/metrics/cpu'),
    getMemory: () => apiClient.get('/metrics/memory'),
    getDisk: () => apiClient.get('/metrics/disk'),
    getNetwork: () => apiClient.get('/metrics/network'),
    getNetworkPerNic: () => apiClient.get('/metrics/network/pernic'),
    getGPU: () => apiClient.get('/metrics/gpu'),
  },
  
  // Auth endpoints
  auth: {
    login: (username: string, password: string) =>
      apiClient.post('/auth/login', new URLSearchParams({ username, password }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    register: (username: string, email: string, password: string) =>
      apiClient.post('/auth/register', { username, email, password }),
    getMe: () => apiClient.get('/auth/me'),
  },
  
  // Protected endpoints (auth required)
  processes: {
    getAll: () => apiClient.get<{ processes: ProcessInfo[]; total: number }>('/processes/'),
    kill: (pid: number) => apiClient.post(`/processes/${pid}/kill`),
    setPriority: (pid: number, priority: number) =>
      apiClient.post(`/processes/${pid}/priority?priority=${priority}`),
  },
  
  history: {
    getMetrics: (startTime: string, endTime: string, metricType?: string, limit?: number, aggregate?: boolean) =>
      apiClient.get('/history/metrics', {
        params: { start_time: startTime, end_time: endTime, metric_type: metricType, limit, aggregate: aggregate !== false },
      }),
    getProcesses: (startTime: string, endTime: string, limit?: number) =>
      apiClient.get('/history/processes', {
        params: { start_time: startTime, end_time: endTime, limit },
      }),
  },
};

