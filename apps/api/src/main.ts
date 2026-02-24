import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalLoggerInterceptor } from './common/interceptors/global-logger.interceptor';

const SWAGGER_HTML = `<!DOCTYPE html>
<html>
  <head>
    <title>Uzum Trend Finder API</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
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

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new GlobalLoggerInterceptor());

  app.enableCors({
    origin: [
      'http://localhost:5173',
      process.env.WEB_URL,
      /^chrome-extension:\/\//,
    ].filter(Boolean) as (string | RegExp)[],
  });

  // Swagger — serve JSON spec + CDN-based UI via raw Express routes
  const config = new DocumentBuilder()
    .setTitle('Uzum Trend Finder API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  const http = app.getHttpAdapter().getInstance();
  http.get('/api-json', (_req: any, res: any) => res.json(document));
  http.get('/api/docs', (_req: any, res: any) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(SWAGGER_HTML);
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
