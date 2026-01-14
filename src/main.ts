import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Global prefix
  const apiPrefix = configService.get<string>('apiPrefix');
  app.setGlobalPrefix(apiPrefix ?? 'api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Lyric Atelier API')
    .setDescription('API for Lyric Atelier - AI-powered lyric generation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // CORS
  app.enableCors();

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);

  const appUrl = await app.getUrl();
  console.log(`Application is running on: ${appUrl}`);
  console.log(`Swagger docs available at: ${appUrl}/api/docs`);
}

void bootstrap();
