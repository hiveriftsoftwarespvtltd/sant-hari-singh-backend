import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: (origin, callback) => {
      // Allow any origin dynamically to prevent CORS block on local networks/IPs
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: true,
  });

  // Serve static uploaded files — /uploads/images/filename.jpg
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/api/uploads',
  });

  // Global prefix (excludes shiprocket routes so /shiprocket/products works with or without /api)
  app.setGlobalPrefix('api', {
    exclude: ['shiprocket', 'shiprocket/(.*)'],
  });

  const port = configService.get<number>('PORT', 9006);
  await app.listen(port);
  console.log(`🚀 Saint Hari Backend running on: http://localhost:${port}/api`);
  console.log(`📁 Static files: http://localhost:${port}/uploads/images/`);
}
bootstrap();
