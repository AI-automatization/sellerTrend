import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalLoggerInterceptor } from './common/interceptors/global-logger.interceptor';
import { ErrorTrackerFilter } from './common/filters/error-tracker.filter';
import { PrismaService } from './prisma/prisma.service';
import { initSentry } from './common/sentry';

const SWAGGER_HTML = `<!DOCTYPE html>
<html>
  <head>
    <title>Uzum Trend Finder API</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = function() {
        SwaggerUIBundle({
          url: '/api-json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
          plugins: [SwaggerUIBundle.plugins.DownloadUrl],
          layout: 'StandaloneLayout',
        });
      };
    </script>
  </body>
</html>`;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await initSentry();

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new GlobalLoggerInterceptor());

  // Error tracker — saves 4xx/5xx errors to system_errors table
  const { httpAdapter } = app.get(HttpAdapterHost);
  const prisma = app.get(PrismaService);
  app.useGlobalFilters(new ErrorTrackerFilter(httpAdapter, prisma));

  app.enableCors({
    origin: [
      'http://localhost:5173',
      process.env.WEB_URL,
      /^chrome-extension:\/\//,
    ].filter(Boolean) as (string | RegExp)[],
  });

  // Swagger: generate spec + serve via raw Express routes (avoids pnpm static asset issues)
  const config = new DocumentBuilder()
    .setTitle('Uzum Trend Finder API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Register BEFORE app.listen() so these routes take priority over NestJS router
  const expressApp = app.getHttpAdapter().getInstance() as any;
  expressApp.get('/api-json', (_req: any, res: any) => res.json(document));
  expressApp.get('/api/docs', (_req: any, res: any) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(SWAGGER_HTML);
  });

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);

  const shutdown = async (signal: string) => {
    console.log(`[${signal}] Graceful shutdown...`);
    const timeout = setTimeout(() => {
      console.error('Shutdown timeout (30s), forcing exit');
      process.exit(1);
    }, 30_000);
    try {
      await app.close();
      clearTimeout(timeout);
      console.log('Shutdown complete');
      process.exit(0);
    } catch (err) {
      console.error('Shutdown error:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
