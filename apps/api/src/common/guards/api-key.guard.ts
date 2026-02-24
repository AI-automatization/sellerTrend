import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ApiKeysService } from '../../api-keys/api-keys.service';

/**
 * Guard that authenticates via X-API-Key header (for Dev Plan API access).
 * Falls through to JWT auth if no X-API-Key header is present.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      throw new ForbiddenException('X-API-Key header required');
    }

    const { accountId } = await this.apiKeysService.validateKey(apiKey);

    // Attach account info to request (same shape as JWT user)
    req.user = {
      account_id: accountId,
      role: 'API_KEY',
    };

    return true;
  }
}
