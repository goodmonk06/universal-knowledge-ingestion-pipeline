import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * 非同期ルートハンドラーをラップして、エラーを自動的にnextに渡す
 */
export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
