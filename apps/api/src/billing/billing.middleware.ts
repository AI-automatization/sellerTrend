import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class BillingMiddleware implements NestMiddleware {
  use(req: Request & { user?: any }, res: Response, next: NextFunction) {
    const account = req.user?.account;

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
