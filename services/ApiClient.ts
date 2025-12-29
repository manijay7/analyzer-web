import { z } from "zod";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

export class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private retryConfig: RetryConfig;

  constructor(baseURL: string = "") {
    this.baseURL =
      baseURL ||
      (typeof window === "undefined" ? process.env.NEXTAUTH_URL || "" : "");
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
    };
  }

  /**
   * Set authorization token
   */
  setAuthToken(token: string) {
    this.defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  /**
   * Remove authorization token
   */
  clearAuthToken() {
    delete this.defaultHeaders["Authorization"];
  }

  /**
   * Generic GET request
   */
  async get<T = any>(
    path: string,
    params?: Record<string, any>,
    config?: RequestConfig
  ): Promise<T> {
    const url = this.buildURL(path, params);
    return this.request<T>("GET", url, undefined, config);
  }

  /**
   * Generic POST request
   */
  async post<T = any>(
    path: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    const url = this.buildURL(path);
    return this.request<T>("POST", url, data, config);
  }

  /**
   * Generic PUT request
   */
  async put<T = any>(
    path: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    const url = this.buildURL(path);
    return this.request<T>("PUT", url, data, config);
  }

  /**
   * Generic PATCH request
   */
  async patch<T = any>(
    path: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    const url = this.buildURL(path);
    return this.request<T>("PATCH", url, data, config);
  }

  /**
   * Generic DELETE request
   */
  async delete<T = any>(path: string, config?: RequestConfig): Promise<T> {
    const url = this.buildURL(path);
    return this.request<T>("DELETE", url, undefined, config);
  }

  /**
   * Core request method with retry logic
   */
  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    const headers = { ...this.defaultHeaders, ...config?.headers };
    const retries = config?.retries ?? this.retryConfig.maxRetries;

    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          config?.timeout || 30000
        );

        const requestOptions: RequestInit = {
          method,
          headers,
          signal: controller.signal,
        };

        if (data && method !== "GET" && method !== "HEAD") {
          requestOptions.body = JSON.stringify(data);
        }

        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Network error" }));
          throw new Error(
            errorData.error || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const result: ApiResponse<T> = await response.json();

        if (!result.success) {
          throw new Error(result.error || "API request failed");
        }

        return result.data as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes("HTTP 4")) {
          break;
        }

        // Calculate delay with exponential backoff
        if (attempt < retries) {
          const delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(2, attempt),
            this.retryConfig.maxDelay
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Build full URL with query parameters
   */
  private buildURL(path: string, params?: Record<string, any>): string {
    const url = new URL(
      path,
      this.baseURL ||
        (typeof window !== "undefined" ? window.location.origin : "")
    );

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile(
    path: string,
    file: File,
    onProgress?: (progress: number) => void,
    config?: RequestConfig
  ): Promise<any> {
    const url = this.buildURL(path);
    const headers = { ...config?.headers };
    // Don't set Content-Type for FormData

    const formData = new FormData();
    formData.append("file", file);

    const requestOptions: RequestInit = {
      method: "POST",
      headers,
      body: formData,
    };

    // Add progress tracking if supported
    if (onProgress && "upload" in new XMLHttpRequest()) {
      return this.uploadWithProgress(url, formData, onProgress, config);
    }

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Upload failed" }));
      throw new Error(errorData.error || "Upload failed");
    }

    return response.json();
  }

  /**
   * Upload with progress tracking using XMLHttpRequest
   */
  private uploadWithProgress(
    url: string,
    formData: FormData,
    onProgress: (progress: number) => void,
    config?: RequestConfig
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || "Upload failed"));
          } catch {
            reject(new Error("Upload failed"));
          }
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener("timeout", () => {
        reject(new Error("Upload timeout"));
      });

      xhr.timeout = config?.timeout || 300000; // 5 minutes for uploads

      xhr.open("POST", url);
      // Set headers
      Object.entries(this.defaultHeaders).forEach(([key, value]) => {
        if (key !== "Content-Type") {
          // Don't set content-type for FormData
          xhr.setRequestHeader(key, value);
        }
      });

      xhr.send(formData);
    });
  }
}
