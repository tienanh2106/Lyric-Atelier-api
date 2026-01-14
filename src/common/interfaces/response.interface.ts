export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
}

export interface ApiErrorResponse {
  success: boolean;
  statusCode: number;
  errorCode: string;
  message: string;
  errors?: Record<string, unknown> | null;
  timestamp: string;
  path: string;
}
