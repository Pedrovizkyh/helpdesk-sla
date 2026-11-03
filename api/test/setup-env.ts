// Ambiente dos testes e2e: banco e Redis separados, sem worker e sem cron.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://helpdesk:helpdesk@localhost:5433/helpdesk_test';
process.env.REDIS_URL =
  process.env.REDIS_URL_TEST ?? 'redis://localhost:6379/1';
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-16';
process.env.RUN_WORKER = 'false';
process.env.RUN_SCHEDULER = 'false';
process.env.EMAIL_ENABLED = 'false';
process.env.LOG_LEVEL = 'silent';
