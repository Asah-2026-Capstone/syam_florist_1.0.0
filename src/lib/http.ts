import type { NextFunction, Request, RequestHandler, Response } from 'express'

/** Respons sukses standar: { success: true, data } */
export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data })
}

/** Teruskan error dari handler async ke error middleware */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next)
  }
