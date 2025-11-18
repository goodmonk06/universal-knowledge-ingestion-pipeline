import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * リクエストバリデーションミドルウェア
 */
export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * ボディのみをバリデーション
 */
export const validateBody = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * クエリパラメータのみをバリデーション
 */
export const validateQuery = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * パスパラメータのみをバリデーション
 */
export const validateParams = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.params);
      req.params = validated as any;
      next();
    } catch (error) {
      next(error);
    }
  };
};
