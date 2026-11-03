import { INestApplication, ValidationPipe } from '@nestjs/common';

/** Configuração comum à aplicação real e aos testes e2e. */
export function configurarApp(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
