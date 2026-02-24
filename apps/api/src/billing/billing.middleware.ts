import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class BillingMiddleware implements NestMiddleware {
  use(req: Request & { user?: any }, res: Response, next: NextFunction) {
    const user = req.user;
    const account = user?.account;

    // SUPER_ADMIN is exempt from billing
    if (user?.role === 'SUPER_ADMIN') return next();

    if (account?.status === 'PAYMENT_DUE') {
      return res.status(402).json({
        error: 'PAYMENT_DUE',
        message: "Balansingiz yetarli emas. Hisobni to'ldiring.",
        balance: account.balance?.toString(),
      });
    }

    next();
  }
}
