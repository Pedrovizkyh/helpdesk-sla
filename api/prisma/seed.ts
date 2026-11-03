import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import {
  PrismaClient,
  Prioridade,
  StatusChamado,
  TipoEvento,
} from '../src/generated/prisma/client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL não definida');

const local = /localhost|127\.0\.0\.1/.test(url);
if (!local && process.env.CONFIRMAR_SEED !== 'sim') {
  throw new Error(
    'O seed APAGA todos os dados. Para rodar fora do ambiente local, use CONFIRMAR_SEED=sim.',
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

export const SENHA_DEMO = 'demo1234';

const POLITICAS: Record<Prioridade, [number, number]> = {
  CRITICA: [30, 8 * 60],
  ALTA: [2 * 60, 24 * 60],
  MEDIA: [4 * 60, 48 * 60],
  BAIXA: [8 * 60, 72 * 60],
};

const agora = Date.now();
const min = (m: number) => new Date(agora - m * 60_000);
const somar = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);

type Evento = {
  tipo: TipoEvento;
  em: Date;
  autorId?: string | null;
  de?: string;
  para?: string;
};
type Comentario = {
  texto: string;
  em: Date;
  autorId: string;
  interno?: boolean;
};

async function main() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "EventoHistorico", "Comentario", "Chamado", "Usuario", "Empresa", "PoliticaSla" RESTART IDENTITY CASCADE',
  );

  for (const [prioridade, [resp, resol]] of Object.entries(POLITICAS)) {
    await prisma.politicaSla.create({
      data: {
        prioridade: prioridade as Prioridade,
        minutosResposta: resp,
        minutosResolucao: resol,
      },
    });
  }

  const acme = await prisma.empresa.create({
    data: { nome: 'Acme Logística', cnpj: '12.345.678/0001-90' },
  });
  const nimbus = await prisma.empresa.create({
    data: { nome: 'Nimbus Saúde', cnpj: '98.765.432/0001-10' },
  });

  const senhaHash = await bcrypt.hash(SENHA_DEMO, 10);
  const usuario = (
    nome: string,
    email: string,
    perfil: 'CLIENTE' | 'TECNICO' | 'GESTOR',
    empresaId?: string,
  ) =>
    prisma.usuario.create({
      data: { nome, email, perfil, senhaHash, empresaId },
    });

  const gestor = await usuario(
    'Marina Costa',
    'gestor@helpdesk.test',
    'GESTOR',
  );
  const tec1 = await usuario('Rafael Lima', 'tecnico@helpdesk.test', 'TECNICO');
  const tec2 = await usuario(
    'Bruno Alves',
    'tecnico2@helpdesk.test',
    'TECNICO',
  );
  const cliAcme = await usuario(
    'Carla Souza',
    'cliente@acme.test',
    'CLIENTE',
    acme.id,
  );
  const cliAcme2 = await usuario(
    'Diego Rocha',
    'diego@acme.test',
    'CLIENTE',
    acme.id,
  );
  const cliNimbus = await usuario(
    'Paula Nunes',
    'cliente@nimbus.test',
    'CLIENTE',
    nimbus.id,
  );

  async function chamado(c: {
    titulo: string;
    descricao: string;
    categoria: string;
    prioridade: Prioridade;
    status: StatusChamado;
    abertoHaMin: number;
    empresaId: string;
    solicitanteId: string;
    tecnicoId?: string;
    respondidoHaMin?: number;
    resolvidoHaMin?: number;
    pausadoHaMin?: number;
    minutosPausados?: number;
    slaEstourado?: boolean;
    comentarios?: Comentario[];
    eventos?: Evento[];
  }) {
    const criadoEm = min(c.abertoHaMin);
    const [resp, resol] = POLITICAS[c.prioridade];
    const pausados = c.minutosPausados ?? 0;
    await prisma.chamado.create({
      data: {
        titulo: c.titulo,
        descricao: c.descricao,
        categoria: c.categoria,
        prioridade: c.prioridade,
        status: c.status,
        criadoEm,
        venceRespostaEm: somar(criadoEm, resp),
        venceResolucaoEm: somar(criadoEm, resol + pausados),
        respondidoEm:
          c.respondidoHaMin !== undefined ? min(c.respondidoHaMin) : null,
        resolvidoEm:
          c.resolvidoHaMin !== undefined ? min(c.resolvidoHaMin) : null,
        pausadoEm: c.pausadoHaMin !== undefined ? min(c.pausadoHaMin) : null,
        minutosPausados: pausados,
        slaEstourado: c.slaEstourado ?? false,
        empresaId: c.empresaId,
        solicitanteId: c.solicitanteId,
        tecnicoId: c.tecnicoId,
        comentarios: {
          create: (c.comentarios ?? []).map((x) => ({
            texto: x.texto,
            autorId: x.autorId,
            interno: x.interno ?? false,
            criadoEm: x.em,
          })),
        },
        eventos: {
          create: [
            {
              tipo: TipoEvento.ABERTO,
              autorId: c.solicitanteId,
              valorNovo: StatusChamado.ABERTO,
              criadoEm,
            },
            ...(c.eventos ?? []).map((e) => ({
              tipo: e.tipo,
              autorId: e.autorId ?? null,
              valorAnterior: e.de,
              valorNovo: e.para,
              criadoEm: e.em,
            })),
          ],
        },
      },
    });
  }

  const st = (
    de: StatusChamado,
    para: StatusChamado,
    em: Date,
    autorId: string,
  ): Evento => ({
    tipo: TipoEvento.STATUS_ALTERADO,
    de,
    para,
    em,
    autorId,
  });
  const atrib = (tecNome: string, em: Date, autorId: string): Evento => ({
    tipo: TipoEvento.ATRIBUIDO,
    para: tecNome,
    em,
    autorId,
  });

  // 1. Crítico, ainda sem resposta e perto de vencer
  await chamado({
    titulo: 'Sistema de faturamento fora do ar',
    descricao:
      'Desde as 9h ninguém consegue emitir notas fiscais. A tela fica carregando e depois mostra erro 502.',
    categoria: 'Sistemas',
    prioridade: 'CRITICA',
    status: 'ABERTO',
    abertoHaMin: 26,
    empresaId: acme.id,
    solicitanteId: cliAcme.id,
  });

  // 2. Alta, em atendimento e no prazo
  await chamado({
    titulo: 'VPN não conecta para a equipe remota',
    descricao:
      'Cinco pessoas que trabalham de casa não conseguem conectar na VPN desde ontem à noite.',
    categoria: 'Rede',
    prioridade: 'ALTA',
    status: 'EM_ATENDIMENTO',
    abertoHaMin: 180,
    empresaId: acme.id,
    solicitanteId: cliAcme2.id,
    tecnicoId: tec1.id,
    respondidoHaMin: 140,
    comentarios: [
      {
        texto:
          'Olá! Já estou verificando o concentrador de VPN. Retorno em breve.',
        em: min(140),
        autorId: tec1.id,
      },
      {
        texto: 'Certificado do servidor VPN expirou ontem às 23h. Renovando.',
        em: min(130),
        autorId: tec1.id,
        interno: true,
      },
    ],
    eventos: [
      atrib(tec1.nome, min(150), tec1.id),
      st('ABERTO', 'EM_ATENDIMENTO', min(150), tec1.id),
      { tipo: 'PRIMEIRA_RESPOSTA', em: min(140), autorId: tec1.id },
      { tipo: 'COMENTARIO', em: min(140), autorId: tec1.id },
      { tipo: 'NOTA_INTERNA', em: min(130), autorId: tec1.id },
    ],
  });

  // 3. Média, SLA de resolução estourado
  await chamado({
    titulo: 'Impressora do 2º andar com falha de papel',
    descricao: 'A impressora atola papel a cada 3 folhas. Já trocamos a resma.',
    categoria: 'Hardware',
    prioridade: 'MEDIA',
    status: 'EM_ATENDIMENTO',
    abertoHaMin: 50 * 60,
    empresaId: nimbus.id,
    solicitanteId: cliNimbus.id,
    tecnicoId: tec2.id,
    respondidoHaMin: 49 * 60,
    slaEstourado: true,
    comentarios: [
      {
        texto: 'Vou passar aí amanhã para olhar o rolete de tração.',
        em: min(49 * 60),
        autorId: tec2.id,
      },
      {
        texto: 'Peça de reposição pedida ao fornecedor, prazo 3 dias.',
        em: min(30 * 60),
        autorId: tec2.id,
        interno: true,
      },
    ],
    eventos: [
      atrib(tec2.nome, min(49.5 * 60), gestor.id),
      st('ABERTO', 'EM_ATENDIMENTO', min(49.2 * 60), tec2.id),
      { tipo: 'PRIMEIRA_RESPOSTA', em: min(49 * 60), autorId: tec2.id },
      { tipo: 'COMENTARIO', em: min(49 * 60), autorId: tec2.id },
      { tipo: 'NOTA_INTERNA', em: min(30 * 60), autorId: tec2.id },
      { tipo: 'SLA_ESTOURADO', para: 'resolucao', em: min(2 * 60) },
    ],
  });

  // 4. Baixa, na fila sem dono
  await chamado({
    titulo: 'Criar usuário no ERP para nova colaboradora',
    descricao:
      'A nova analista financeira começa segunda e precisa de acesso ao ERP.',
    categoria: 'Acessos',
    prioridade: 'BAIXA',
    status: 'ABERTO',
    abertoHaMin: 60,
    empresaId: nimbus.id,
    solicitanteId: cliNimbus.id,
  });

  // 5. Média, aguardando cliente (relógio pausado)
  await chamado({
    titulo: 'Erro ao exportar relatório mensal em PDF',
    descricao: 'Ao exportar o relatório de entregas, o PDF sai em branco.',
    categoria: 'Sistemas',
    prioridade: 'MEDIA',
    status: 'AGUARDANDO_CLIENTE',
    abertoHaMin: 300,
    empresaId: acme.id,
    solicitanteId: cliAcme.id,
    tecnicoId: tec1.id,
    respondidoHaMin: 260,
    pausadoHaMin: 120,
    comentarios: [
      {
        texto: 'Consegue me enviar o período e o filtro usados na exportação?',
        em: min(120),
        autorId: tec1.id,
      },
    ],
    eventos: [
      atrib(tec1.nome, min(270), tec1.id),
      st('ABERTO', 'EM_ATENDIMENTO', min(270), tec1.id),
      { tipo: 'PRIMEIRA_RESPOSTA', em: min(260), autorId: tec1.id },
      { tipo: 'COMENTARIO', em: min(120), autorId: tec1.id },
      st('EM_ATENDIMENTO', 'AGUARDANDO_CLIENTE', min(120), tec1.id),
    ],
  });

  // 6. Alta, resolvido aguardando confirmação
  await chamado({
    titulo: 'Lentidão no acesso ao e-mail corporativo',
    descricao: 'O Outlook demora mais de 1 minuto para abrir as mensagens.',
    categoria: 'E-mail',
    prioridade: 'ALTA',
    status: 'RESOLVIDO',
    abertoHaMin: 20 * 60,
    empresaId: acme.id,
    solicitanteId: cliAcme.id,
    tecnicoId: tec2.id,
    respondidoHaMin: 19 * 60,
    resolvidoHaMin: 180,
    comentarios: [
      {
        texto: 'Estou analisando a caixa de vocês.',
        em: min(19 * 60),
        autorId: tec2.id,
      },
      {
        texto:
          'Caixa estava com 49 GB. Arquivei mensagens antigas e reindexei. Pode testar?',
        em: min(180),
        autorId: tec2.id,
      },
    ],
    eventos: [
      atrib(tec2.nome, min(19.5 * 60), tec2.id),
      st('ABERTO', 'EM_ATENDIMENTO', min(19.5 * 60), tec2.id),
      { tipo: 'PRIMEIRA_RESPOSTA', em: min(19 * 60), autorId: tec2.id },
      { tipo: 'COMENTARIO', em: min(19 * 60), autorId: tec2.id },
      { tipo: 'COMENTARIO', em: min(180), autorId: tec2.id },
      st('EM_ATENDIMENTO', 'RESOLVIDO', min(180), tec2.id),
    ],
  });

  // 7. Crítico, fechado dentro do SLA
  await chamado({
    titulo: 'Prontuário eletrônico indisponível',
    descricao: 'Médicos não conseguem acessar prontuários. Atendimento parado.',
    categoria: 'Sistemas',
    prioridade: 'CRITICA',
    status: 'FECHADO',
    abertoHaMin: 6 * 24 * 60,
    empresaId: nimbus.id,
    solicitanteId: cliNimbus.id,
    tecnicoId: tec1.id,
    respondidoHaMin: 6 * 24 * 60 - 12,
    resolvidoHaMin: 6 * 24 * 60 - 5 * 60,
    comentarios: [
      {
        texto: 'Identificamos queda no banco de dados. Já estamos atuando.',
        em: min(6 * 24 * 60 - 12),
        autorId: tec1.id,
      },
      {
        texto:
          'Serviço restabelecido. Disco do servidor cheio, ampliamos o volume.',
        em: min(6 * 24 * 60 - 5 * 60),
        autorId: tec1.id,
      },
      {
        texto: 'Confirmado, tudo funcionando. Obrigada!',
        em: min(6 * 24 * 60 - 6 * 60),
        autorId: cliNimbus.id,
      },
    ],
    eventos: [
      atrib(tec1.nome, min(6 * 24 * 60 - 10), gestor.id),
      st('ABERTO', 'EM_ATENDIMENTO', min(6 * 24 * 60 - 15), tec1.id),
      {
        tipo: 'PRIMEIRA_RESPOSTA',
        em: min(6 * 24 * 60 - 12),
        autorId: tec1.id,
      },
      st('EM_ATENDIMENTO', 'RESOLVIDO', min(6 * 24 * 60 - 5 * 60), tec1.id),
      st('RESOLVIDO', 'FECHADO', min(6 * 24 * 60 - 6 * 60), cliNimbus.id),
    ],
  });

  // 8. Baixa, fechado fora do SLA
  await chamado({
    titulo: 'Trocar mouse da recepção',
    descricao: 'O mouse da recepção parou de funcionar.',
    categoria: 'Hardware',
    prioridade: 'BAIXA',
    status: 'FECHADO',
    abertoHaMin: 5 * 24 * 60,
    empresaId: acme.id,
    solicitanteId: cliAcme2.id,
    tecnicoId: tec2.id,
    respondidoHaMin: 5 * 24 * 60 - 6 * 60,
    resolvidoHaMin: 5 * 24 * 60 - 80 * 60,
    slaEstourado: true,
    comentarios: [
      {
        texto: 'Vamos separar um mouse novo.',
        em: min(5 * 24 * 60 - 6 * 60),
        autorId: tec2.id,
      },
      {
        texto: 'Mouse trocado.',
        em: min(5 * 24 * 60 - 80 * 60),
        autorId: tec2.id,
      },
    ],
    eventos: [
      st('ABERTO', 'EM_ATENDIMENTO', min(5 * 24 * 60 - 6 * 60), tec2.id),
      {
        tipo: 'PRIMEIRA_RESPOSTA',
        em: min(5 * 24 * 60 - 6 * 60),
        autorId: tec2.id,
      },
      {
        tipo: 'SLA_ESTOURADO',
        para: 'resolucao',
        em: min(5 * 24 * 60 - 72 * 60),
      },
      st('EM_ATENDIMENTO', 'RESOLVIDO', min(5 * 24 * 60 - 80 * 60), tec2.id),
      st('RESOLVIDO', 'FECHADO', min(5 * 24 * 60 - 81 * 60), cliAcme2.id),
    ],
  });

  // 9. Média, cancelado pelo cliente
  await chamado({
    titulo: 'Dúvida sobre rotina de backup',
    descricao: 'Queremos entender com que frequência o backup é feito.',
    categoria: 'Dúvida',
    prioridade: 'MEDIA',
    status: 'CANCELADO',
    abertoHaMin: 3 * 24 * 60,
    empresaId: nimbus.id,
    solicitanteId: cliNimbus.id,
    eventos: [st('ABERTO', 'CANCELADO', min(3 * 24 * 60 - 30), cliNimbus.id)],
  });

  // 10. Alta, atribuído pelo gestor e perto de vencer a resposta
  await chamado({
    titulo: 'Certificado SSL do portal expira amanhã',
    descricao:
      'Recebemos alerta de que o certificado do portal do cliente expira amanhã.',
    categoria: 'Segurança',
    prioridade: 'ALTA',
    status: 'ABERTO',
    abertoHaMin: 110,
    empresaId: acme.id,
    solicitanteId: cliAcme.id,
    tecnicoId: tec2.id,
    eventos: [atrib(tec2.nome, min(90), gestor.id)],
  });

  console.log('Seed concluído: 2 empresas, 6 usuários, 10 chamados.');
  console.log(`Senha de todos os usuários de demonstração: ${SENHA_DEMO}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
