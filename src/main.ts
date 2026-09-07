import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PORTAL_AUTH, TENANT_AUTH } from '@common/swagger.constants';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Validación global de DTOs: rechaza propiedades desconocidas y transforma
  // los payloads a las clases DTO (requisito para class-validator).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Documentación OpenAPI en /docs. Los dos esquemas de auth de la Fase 0 se
  // modelan como api-keys por header (stub de sesión hasta OAuth2/OIDC).
  const config = new DocumentBuilder()
    .setTitle('Operaciones API')
    .setDescription(
      'Plataforma 3PL — API de la Fase 0. Autenticación por JWT (Bearer): ' +
        'obtén un token en POST /v1/auth/login (operador) o POST /portal/auth/login (cliente).',
    )
    .setVersion('0.1')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, TENANT_AUTH)
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, PORTAL_AUTH)
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`Operaciones escuchando en el puerto ${port}`);
  logger.log(`Documentación OpenAPI en http://localhost:${port}/docs`);
}

void bootstrap();
