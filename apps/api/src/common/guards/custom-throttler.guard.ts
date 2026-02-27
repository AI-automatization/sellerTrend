import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const role = req.user?.role;
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      return true;
    }
    return false;
  }
}
