import { Module, Global } from '@nestjs/common';
import { ProductGateway } from './product.gateway';

@Global()
@Module({
  providers: [ProductGateway],
  exports: [ProductGateway],
})
export class GatewayModule {}
