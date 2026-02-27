import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

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

  handleConnection(client: Socket) {
    // Join account-specific room for targeted signals
    const accountId = client.handshake.query.account_id as string;
    if (accountId) {
      client.join(`account:${accountId}`);
    }
    this.logger.log(`WS connected: ${client.id} (account: ${accountId ?? 'anon'})`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WS disconnected: ${client.id}`);
  }

  // ─── Refresh Signals ─────────────────────────────────
  // These emit lightweight "something changed" signals.
  // Frontend should refetch via REST — WS is NOT the data source.

  /** Signal: a tracked product's score/data changed */
  signalScoreUpdate(productId: string) {
    this.server.emit('refresh:score', { product_id: productId });
  }

  /** Signal: discovery run progress changed */
  signalDiscoveryProgress(runId: string, status: string, progress: number) {
    this.server.emit('refresh:discovery', { run_id: runId, status, progress });
  }

  /** Signal: new alert for a specific account */
  signalAlert(accountId: string, type: string) {
    this.server.to(`account:${accountId}`).emit('refresh:alert', { type });
  }

  /** Signal: new notification for a specific account */
  signalNotification(accountId: string) {
    this.server.to(`account:${accountId}`).emit('refresh:notification', {});
  }
}
