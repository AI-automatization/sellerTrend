import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../../auth/jwt.strategy';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:5173',
      process.env.WEB_URL,
      /^chrome-extension:\/\//,
    ].filter(Boolean),
  },
  namespace: '/ws',
})
export class ProductGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ProductGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(`WS rejected (no token): ${client.id}`);
      client.emit('error', { message: 'Authentication required' });
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      const accountId = payload.account_id;

      if (!accountId) {
        this.logger.warn(`WS rejected (no account_id in token): ${client.id}`);
        client.emit('error', { message: 'Invalid token: missing account_id' });
        client.disconnect(true);
        return;
      }

      // Store verified identity on the socket
      client.data.accountId = accountId;
      client.data.userId = payload.sub;

      // Join account-scoped room for targeted signals
      client.join(`account:${accountId}`);

      this.logger.log(`WS connected: ${client.id} (account: ${accountId})`);
    } catch {
      this.logger.warn(`WS rejected (invalid token): ${client.id}`);
      client.emit('error', { message: 'Invalid or expired token' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WS disconnected: ${client.id}`);
  }

  // ─── Refresh Signals ─────────────────────────────────
  // These emit lightweight "something changed" signals.
  // Frontend should refetch via REST — WS is NOT the data source.

  /** Signal: a tracked product's score/data changed (scoped to account) */
  signalScoreUpdate(accountId: string, productId: string) {
    this.server
      .to(`account:${accountId}`)
      .emit('refresh:score', { product_id: productId });
  }

  /** Signal: discovery run progress changed (scoped to account) */
  signalDiscoveryProgress(
    accountId: string,
    runId: string,
    status: string,
    progress: number,
  ) {
    this.server
      .to(`account:${accountId}`)
      .emit('refresh:discovery', { run_id: runId, status, progress });
  }

  /** Signal: new alert for a specific account */
  signalAlert(accountId: string, type: string) {
    this.server.to(`account:${accountId}`).emit('refresh:alert', { type });
  }

  /** Signal: new notification for a specific account */
  signalNotification(accountId: string) {
    this.server.to(`account:${accountId}`).emit('refresh:notification', {});
  }

  // ─── Private Helpers ──────────────────────────────────

  /**
   * Extract JWT token from multiple sources (priority order):
   * 1. Socket.IO auth object (recommended)
   * 2. Authorization header (Bearer token)
   * 3. Query parameter (fallback for legacy clients)
   */
  private extractToken(client: Socket): string | null {
    // 1. Socket.IO auth object — preferred method
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    // 2. Authorization header — standard HTTP approach
    const authHeader = client.handshake.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // 3. Query parameter — backward-compatible fallback
    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.length > 0) {
      return queryToken;
    }

    return null;
  }
}
