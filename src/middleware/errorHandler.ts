import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * 標準エラーレスポンス
 */
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: any;
  };
}

/**
 * 標準成功レスポンス
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    count?: number;
    total?: number;
    page?: number;
  };
}

/**
 * カスタムエラークラス
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * エラーハンドリングミドルウェア
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error occurred:', err);

  // Zodバリデーションエラー
  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        message: 'バリデーションエラー',
        code: 'VALIDATION_ERROR',
        details: err.errors,
      },
    };
    return res.status(400).json(response);
  }

  // カスタムアプリケーションエラー
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        message: err.message,
        code: err.code,
        details: err.details,
      },
    };
    return res.status(err.statusCode).json(response);
  }

  // 予期しないエラー
  const response: ErrorResponse = {
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production'
        ? '内部サーバーエラーが発生しました'
        : err.message,
      code: 'INTERNAL_ERROR',
    },
  };
  res.status(500).json(response);
};

/**
 * 404ハンドラー
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const response: ErrorResponse = {
    success: false,
    error: {
      message: 'リソースが見つかりません',
      code: 'NOT_FOUND',
    },
  };
  res.status(404).json(response);
};
