import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ApiResponse } from '../interfaces/response.interface';

interface ResponseData {
  message?: string;
  data?: unknown;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((data: T | ResponseData) => {
        const responseData = data as ResponseData;
        return {
          success: true,
          statusCode: response.statusCode,
          message: responseData?.message ?? 'Operation completed successfully',
          data: (responseData?.data !== undefined
            ? responseData.data
            : data) as T,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
