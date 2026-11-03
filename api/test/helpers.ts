import { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Queue } from 'bullmq';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Relogio } from '../src/common/relogio';
import { configurarApp } from '../src/configurar-app';
import { FILA_EMAILS } from '../src/notificacoes/constantes';
import { PrismaService } from '../src/prisma/prisma.service';

export const SENHA = 'senha-teste';

/** Relógio controlado pelo teste. */
export class RelogioFalso extends Relogio {
  atual = new Date('2026-03-10T12:00:00.000Z');
  agora() {
    return new Date(this.atual);
  }
  avancarMinutos(min: number) {
    this.atual = new Date(this.atual.getTime() + min * 60_000);
  }
}

export interface Contexto {
  app: INestApplication;
  prisma: PrismaService;
  relogio: RelogioFalso;
  fila: Queue;
  http: () => ReturnType<typeof request>;
}

export async function criarApp(): Promise<Contexto> {
  const relogio = new RelogioFalso();
  const modulo = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Relogio)
    .useValue(relogio)
    .compile();
  const app = modulo.createNestApplication({ logger: false });
  configurarApp(app);
  await app.init();
  return {
    app,
    relogio,
    prisma: app.get(PrismaService),
    fila: app.get<Queue>(getQueueToken(FILA_EMAILS)),
    http: () => request(app.getHttpServer()),
  };
}

export interface Dados {
  acme: { id: string };
  nimbus: { id: string };
}

/** Zera o banco e a fila e cria a base mínima para cada teste. */
export async function prepararBanco(ctx: Contexto): Promise<Dados> {
  const { prisma } = ctx;
  await prisma.$executeRawUnsafe(
    'TRUNCATE "EventoHistorico", "Comentario", "Chamado", "Usuario", "Empresa", "PoliticaSla" RESTART IDENTITY CASCADE',
  );
  await ctx.fila.obliterate({ force: true });
  ctx.relogio.atual = new Date('2026-03-10T12:00:00.000Z');

  await prisma.politicaSla.createMany({
    data: [
      { prioridade: 'CRITICA', minutosResposta: 30, minutosResolucao: 480 },
      { prioridade: 'ALTA', minutosResposta: 120, minutosResolucao: 1440 },
      { prioridade: 'MEDIA', minutosResposta: 240, minutosResolucao: 2880 },
      { prioridade: 'BAIXA', minutosResposta: 480, minutosResolucao: 4320 },
    ],
  });
  const acme = await prisma.empresa.create({
    data: { nome: 'Acme', cnpj: '11.111.111/0001-11' },
  });
  const nimbus = await prisma.empresa.create({
    data: { nome: 'Nimbus', cnpj: '22.222.222/0001-22' },
  });
  const senhaHash = await bcrypt.hash(SENHA, 4);
  await prisma.usuario.createMany({
    data: [
      { nome: 'Gestor', email: 'gestor@t.test', perfil: 'GESTOR', senhaHash },
      { nome: 'Tec Um', email: 'tec1@t.test', perfil: 'TECNICO', senhaHash },
      { nome: 'Tec Dois', email: 'tec2@t.test', perfil: 'TECNICO', senhaHash },
      {
        nome: 'Cli Acme',
        email: 'cli@acme.test',
        perfil: 'CLIENTE',
        senhaHash,
        empresaId: acme.id,
      },
      {
        nome: 'Cli Nimbus',
        email: 'cli@nimbus.test',
        perfil: 'CLIENTE',
        senhaHash,
        empresaId: nimbus.id,
      },
    ],
  });
  return { acme, nimbus };
}

export async function token(ctx: Contexto, email: string) {
  const res = await ctx
    .http()
    .post('/auth/login')
    .send({ email, senha: SENHA })
    .expect(200);
  return `Bearer ${res.body.accessToken}`;
}

export async function tokens(ctx: Contexto) {
  return {
    gestor: await token(ctx, 'gestor@t.test'),
    tec1: await token(ctx, 'tec1@t.test'),
    tec2: await token(ctx, 'tec2@t.test'),
    cliAcme: await token(ctx, 'cli@acme.test'),
    cliNimbus: await token(ctx, 'cli@nimbus.test'),
  };
}

export async function jobsNaFila(ctx: Contexto) {
  const jobs = await ctx.fila.getJobs(['waiting', 'delayed', 'prioritized']);
  return jobs.map((j) => j.name).sort();
}

export const novoChamado = {
  titulo: 'VPN não conecta',
  descricao: 'Ninguém da equipe remota consegue conectar.',
  categoria: 'Rede',
  prioridade: 'ALTA',
};
