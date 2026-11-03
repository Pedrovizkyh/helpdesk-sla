import type { DefaultJobOptions } from 'bullmq';

export const FILA_EMAILS = 'emails';

/** 3 tentativas com espera crescente: 10s, 20s, 40s... */
export const OPCOES_JOB_EMAIL: DefaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 10_000 },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 500 },
};

export interface EmailJob {
  para: string[];
  assunto: string;
  html: string;
  chamadoId?: string;
}
