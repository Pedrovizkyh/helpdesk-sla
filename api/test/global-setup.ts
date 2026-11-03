import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

export default function globalSetup() {
  require('./setup-env');
  const url = process.env.DATABASE_URL!;
  if (!/test/.test(url)) {
    throw new Error(`Recusando rodar e2e fora de um banco de teste: ${url}`);
  }
  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    env: process.env,
    stdio: 'inherit',
  });
}
