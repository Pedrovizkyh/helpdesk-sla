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
