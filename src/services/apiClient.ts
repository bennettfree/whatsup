import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { ApiError } from '@/types';

// Backend base URL for API calls. Must be configured via EXPO_PUBLIC_API_URL
// so that mobile devices can reach your API over the network.
// When undefined, API calls should gracefully no-op at the service layer.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

/**
 * Mock data is **opt-in only**.
 *
 * - When true, UI layers may choose to fall back to local mock data if the backend is unreachable.
 * - When false/undefined, the app should surface backend connectivity issues instead of silently
 *   showing mock content (helps avoid shipping/demoing fake data by accident).
 */
export const ENABLE_MOCK_DATA = process.env.EXPO_PUBLIC_ENABLE_MOCK_DATA === 'true';

// Log the API URL on startup for debugging
if (__DEV__) {
  console.log('📡 API Configuration:');
  console.log('  EXPO_PUBLIC_API_URL:', API_BASE_URL || '❌ NOT SET');
  console.log('  EXPO_PUBLIC_ENABLE_MOCK_DATA:', ENABLE_MOCK_DATA ? 'true' : 'false');
  if (!API_BASE_URL) {
    console.warn('⚠️  Backend API URL not configured! Network-backed features will be unavailable.');
    console.warn('⚠️  Set EXPO_PUBLIC_API_URL in your .env file');
  }
}

class ApiClient {
  private client: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000, // Reduced to 10 seconds (from 30s)
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - clear token and redirect to login
          this.authToken = null;
          // TODO: Emit event or call store to logout
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();



