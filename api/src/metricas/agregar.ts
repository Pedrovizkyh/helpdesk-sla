import type { StatusChamado } from '../generated/prisma/enums';

export interface LinhaMetrica {
  status: StatusChamado;
  prioridade: string;
  criadoEm: Date;
  respondidoEm: Date | null;
  resolvidoEm: Date | null;
  minutosPausados: number;
  slaEstourado: boolean;
  tecnico: { id: string; nome: string } | null;
}

const STATUS: StatusChamado[] = [
  'ABERTO',
  'EM_ATENDIMENTO',
  'AGUARDANDO_CLIENTE',
  'RESOLVIDO',
  'FECHADO',
  'CANCELADO',
];
const ATIVOS: StatusChamado[] = [
  'ABERTO',
  'EM_ATENDIMENTO',
  'AGUARDANDO_CLIENTE',
];
const CONCLUIDOS: StatusChamado[] = ['RESOLVIDO', 'FECHADO'];

const minutos = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 60_000;
const media = (v: number[]) =>
  v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null;
const dia = (d: Date) => d.toISOString().slice(0, 10);

export function agregarMetricas(linhas: LinhaMetrica[], de: Date, ate: Date) {
  const porStatus = Object.fromEntries(STATUS.map((s) => [s, 0])) as Record<
    StatusChamado,
    number
  >;
  const porPrioridade: Record<string, number> = {};
  const tecnicos = new Map<
    string,
    {
      id: string;
      nome: string;
      total: number;
      resolvidos: number;
      estourados: number;
    }
  >();
  const dias = new Map<
    string,
    { dia: string; abertos: number; resolvidos: number }
  >();
  for (
    let d = new Date(dia(de));
    d <= ate;
    d = new Date(d.getTime() + 86_400_000)
  ) {
    dias.set(dia(d), { dia: dia(d), abertos: 0, resolvidos: 0 });
  }

  const temposResolucao: number[] = [];
  const temposResposta: number[] = [];
  let concluidos = 0;
  let concluidosNoPrazo = 0;

  for (const c of linhas) {
    porStatus[c.status]++;
    porPrioridade[c.prioridade] = (porPrioridade[c.prioridade] ?? 0) + 1;
    const dAbertura = dias.get(dia(c.criadoEm));
    if (dAbertura) dAbertura.abertos++;

    if (c.respondidoEm)
      temposResposta.push(minutos(c.criadoEm, c.respondidoEm));
    if (c.resolvidoEm) {
      // tempo útil: desconta o período em Aguardando cliente
      temposResolucao.push(
        minutos(c.criadoEm, c.resolvidoEm) - c.minutosPausados,
      );
      const dResolucao = dias.get(dia(c.resolvidoEm));
      if (dResolucao) dResolucao.resolvidos++;
    }
    if (CONCLUIDOS.includes(c.status)) {
      concluidos++;
      if (!c.slaEstourado) concluidosNoPrazo++;
    }
    if (c.tecnico) {
      const t = tecnicos.get(c.tecnico.id) ?? {
        ...c.tecnico,
        total: 0,
        resolvidos: 0,
        estourados: 0,
      };
      t.total++;
      if (CONCLUIDOS.includes(c.status)) t.resolvidos++;
      if (c.slaEstourado) t.estourados++;
      tecnicos.set(c.tecnico.id, t);
    }
  }

  return {
    periodo: { de, ate },
    total: linhas.length,
    porStatus,
    porPrioridade,
    tempoMedioRespostaMin: media(temposResposta),
    tempoMedioResolucaoMin: media(temposResolucao),
    percentualDentroSla: concluidos
      ? Math.round((concluidosNoPrazo / concluidos) * 1000) / 10
      : null,
    estouradosEmAberto: linhas.filter(
      (c) => c.slaEstourado && ATIVOS.includes(c.status),
    ).length,
    porTecnico: [...tecnicos.values()].sort((a, b) => b.total - a.total),
    porDia: [...dias.values()],
  };
}
