import type { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncRouteFn = (req: Request, res: Response) => Promise<unknown>;

export function asyncHandler(fn: AsyncRouteFn): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}
