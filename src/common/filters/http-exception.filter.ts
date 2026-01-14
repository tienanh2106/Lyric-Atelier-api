import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../enums/error-code.enum';
import { ApiErrorResponse } from '../interfaces/response.interface';

interface ExceptionResponse {
  message?: string | string[];
  errors?: Record<string, unknown> | null;
  errorCode?: ErrorCode;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errors: Record<string, unknown> | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const typedResponse = exceptionResponse as ExceptionResponse;
        message = typedResponse.message ?? message;
        errors = typedResponse.errors ?? null;
        errorCode =
          typedResponse.errorCode ?? this.mapStatusToErrorCode(status);
      } else {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      statusCode: status,
      errorCode,
      message: Array.isArray(message) ? message.join(', ') : message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }

  private mapStatusToErrorCode(status: number): ErrorCode {
    if (status === Number(HttpStatus.UNAUTHORIZED)) {
      return ErrorCode.UNAUTHORIZED;
    }
    if (status === Number(HttpStatus.FORBIDDEN)) {
      return ErrorCode.FORBIDDEN;
    }
    if (status === Number(HttpStatus.NOT_FOUND)) {
      return ErrorCode.NOT_FOUND;
    }
    if (status === Number(HttpStatus.BAD_REQUEST)) {
      return ErrorCode.VALIDATION_ERROR;
    }
    return ErrorCode.INTERNAL_SERVER_ERROR;
  }
}
