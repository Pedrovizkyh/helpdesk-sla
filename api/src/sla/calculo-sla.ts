const MINUTO = 60_000;

export interface PoliticaPrazos {
  minutosResposta: number;
  minutosResolucao: number;
}

export interface Prazos {
  venceRespostaEm: Date;
  venceResolucaoEm: Date;
}

export const somarMinutos = (data: Date, minutos: number) =>
  new Date(data.getTime() + minutos * MINUTO);

/**
 * Prazos contados a partir da abertura. O tempo já pausado
 * (Aguardando cliente) empurra só o prazo de resolução.
 */
export function calcularPrazos(
  abertoEm: Date,
  politica: PoliticaPrazos,
  minutosPausados = 0,
): Prazos {
  return {
    venceRespostaEm: somarMinutos(abertoEm, politica.minutosResposta),
    venceResolucaoEm: somarMinutos(
      abertoEm,
      politica.minutosResolucao + minutosPausados,
    ),
  };
}

export interface EstadoPausa {
  venceResolucaoEm: Date;
  pausadoEm: Date | null;
  minutosPausados: number;
}

/** Ao sair de Aguardando cliente, empurra o prazo de resolução pelo tempo parado. */
export function retomarPrazo(c: EstadoPausa, agora: Date) {
  if (!c.pausadoEm) {
    return {
      venceResolucaoEm: c.venceResolucaoEm,
      minutosPausados: c.minutosPausados,
      pausadoEm: null,
      minutosParados: 0,
    };
  }
  const minutosParados = Math.max(
    0,
    Math.round((agora.getTime() - c.pausadoEm.getTime()) / MINUTO),
  );
  return {
    venceResolucaoEm: somarMinutos(c.venceResolucaoEm, minutosParados),
    minutosPausados: c.minutosPausados + minutosParados,
    pausadoEm: null,
    minutosParados,
  };
}

export type TipoVencimento = 'resposta' | 'resolucao';

export interface EstadoSla {
  status: string;
  venceRespostaEm: Date;
  venceResolucaoEm: Date;
  respondidoEm: Date | null;
  resolvidoEm: Date | null;
}

const ENCERRADOS = ['FECHADO', 'CANCELADO'];

/** Diz qual prazo venceu (ou null). Resolução não vence enquanto está pausada. */
export function prazoVencido(c: EstadoSla, agora: Date): TipoVencimento | null {
  if (c.status === 'CANCELADO') return null;
  const respostaEm =
    c.respondidoEm ?? (ENCERRADOS.includes(c.status) ? null : agora);
  if (respostaEm && respostaEm > c.venceRespostaEm) return 'resposta';

  if (c.status === 'AGUARDANDO_CLIENTE') return null;
  const resolucaoEm =
    c.resolvidoEm ?? (ENCERRADOS.includes(c.status) ? null : agora);
  if (resolucaoEm && resolucaoEm > c.venceResolucaoEm) return 'resolucao';
  return null;
}
