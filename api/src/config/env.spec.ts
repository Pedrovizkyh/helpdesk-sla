import { validarEnv } from './env';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: '0123456789abcdef0123',
};

describe('validarEnv', () => {
  it('aceita o mínimo e aplica padrões', () => {
    const env = validarEnv(base);
    expect(env.PORT).toBe(3000);
    expect(env.RUN_WORKER).toBe(false);
  });

  it('falha sem DATABASE_URL', () => {
    expect(() => validarEnv({ ...base, DATABASE_URL: undefined })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('exige EMAIL_REDIRECT_TO em produção com e-mail ligado', () => {
    expect(() =>
      validarEnv({ ...base, NODE_ENV: 'production', EMAIL_ENABLED: 'true' }),
    ).toThrow(/EMAIL_REDIRECT_TO/);
  });
});
