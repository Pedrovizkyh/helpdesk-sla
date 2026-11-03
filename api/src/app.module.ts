import { Module } from '@nestjs/common';
import { ConditionalModule, ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { redisOptionsFromUrl } from './config/redis';
import { EmailWorkerModule } from './notificacoes/email-worker.module';
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
          quietReqLogger: true,
          serializers: {
            req: (req: { id: string; method: string; url: string }) => ({
              id: req.id,
              method: req.method,
              url: req.url,
            }),
          },
          redact: ['req.headers.authorization', 'req.body.senha'],
          autoLogging: { ignore: (req) => req.url === '/health' },
          transport:
            config.get('NODE_ENV') === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
        },
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: redisOptionsFromUrl(config.get('REDIS_URL')),
      }),
    }),
    ConditionalModule.registerWhen(
      EmailWorkerModule,
      (env) => env.RUN_WORKER === 'true',
    ),
    ConditionalModule.registerWhen(
      ScheduleModule.forRoot(),
      (env) => env.RUN_SCHEDULER === 'true',
    ),
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
