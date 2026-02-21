import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { UzumModule } from './uzum/uzum.module';
import { ProductsModule } from './products/products.module';
import { BillingMiddleware } from './billing/billing.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    BillingModule,
    UzumModule,
    ProductsModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply billing guard to all protected routes (except auth)
    consumer
      .apply(BillingMiddleware)
      .exclude(
        { path: 'api/v1/auth/(.*)', method: RequestMethod.ALL },
        { path: 'api/docs/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
