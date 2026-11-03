import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { Env, validarEnv } from './config/env';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { EmpresasModule } from './empresas/empresas.module';
import { ChamadosModule } from './chamados/chamados.module';
import { SlaModule } from './sla/sla.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarEnv }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL'),
          genReqId: (req) => req.headers['x-request-id'] ?? randomUUID(),
          redact: ['req.headers.authorization', 'req.body.senha'],
          autoLogging: { ignore: (req) => req.url === '/health' },
          transport:
            config.get('NODE_ENV') === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    EmpresasModule,
    ChamadosModule,
    SlaModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
