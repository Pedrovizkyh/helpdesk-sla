import { z } from 'zod';

const booleano = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET precisa de 16+ caracteres'),
    JWT_EXPIRES_IN: z.string().default('8h'),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    RUN_WORKER: booleano,
    RUN_SCHEDULER: booleano,
    EMAIL_ENABLED: booleano,
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SMTP_SECURE: booleano,
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().default('Helpdesk SLA <no-reply@helpdesk.test>'),
    EMAIL_REDIRECT_TO: z.string().email().optional().or(z.literal('')),
  })
  .superRefine((env, ctx) => {
    if (
      env.NODE_ENV === 'production' &&
      env.EMAIL_ENABLED &&
      !env.EMAIL_REDIRECT_TO
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_REDIRECT_TO'],
        message:
          'Em produção com e-mail ligado, defina EMAIL_REDIRECT_TO (caixa de teste)',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validarEnv(config: Record<string, unknown>): Env {
  const resultado = envSchema.safeParse(config);
  if (!resultado.success) {
    const erros = resultado.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${erros}`);
  }
  return resultado.data;
}
