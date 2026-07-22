import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { initSentry } from './common/sentry';

async function bootstrap() {
  initSentry();

  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const configService = app.get(ConfigService);

  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(cookieParser());

  app.use(
    express.json({
      verify: (req: express.Request & { rawBody?: Buffer }, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );

  const corsOrigins = configService
    .get<string>('CORS_ORIGIN', 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-ID',
      'x-paystack-signature',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new AllExceptionsFilter());

  const accessSecret = configService.get<string>('JWT_ACCESS_SECRET');
  const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET');
  if (!accessSecret || !refreshSecret) {
    throw new Error(
      'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set. ' +
        'Add them to your .env file. See .env.example for reference.',
    );
  }

  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const enableSwagger =
    configService.get<string>('ENABLE_SWAGGER') === 'true' ||
    (nodeEnv !== 'production' &&
      configService.get<string>('ENABLE_SWAGGER') !== 'false');

  if (enableSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Lanita SMS API')
      .setDescription('HeckTeck School Management System API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(configService.get<number>('PORT', 3001));
}
bootstrap();
