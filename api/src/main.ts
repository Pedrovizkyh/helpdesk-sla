import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { Env } from './config/env';
import { configurarApp } from './configurar-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const config = app.get(ConfigService<Env, true>);

  app.enableCors({
    origin: config
      .get('CORS_ORIGINS')
      .split(',')
      .map((o: string) => o.trim()),
    credentials: true,
  });
  configurarApp(app);
  app.enableShutdownHooks();

  const doc = new DocumentBuilder()
    .setTitle('Helpdesk com SLA')
    .setDescription('API de chamados com controle de SLA, filas e RBAC')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, doc));

  await app.listen(config.get('PORT'), '0.0.0.0');
}
void bootstrap();
