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
    this.logger.log(`WS client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WS client disconnected: ${client.id}`);
  }

  /** Emit score update to all connected clients */
  emitScoreUpdate(productId: string, data: {
    score: number;
    weekly_bought: number;
    trend: string;
    updated_at: string;
  }) {
    this.server.emit('score:update', { product_id: productId, ...data });
  }

  /** Emit discovery run progress */
  emitDiscoveryProgress(runId: string, data: {
    status: string;
    progress: number;
    winners_count: number;
  }) {
    this.server.emit('discovery:progress', { run_id: runId, ...data });
  }

  /** Emit alert notification */
  emitAlert(accountId: string, data: {
    type: string;
    product_id: string;
    message: string;
  }) {
    this.server.emit(`alert:${accountId}`, data);
  }
}
