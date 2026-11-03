import {
  calcularPrazos,
  prazoVencido,
  retomarPrazo,
  type EstadoSla,
} from './calculo-sla';

const abertura = new Date('2026-03-10T09:00:00.000Z');
const h = (horas: number) => new Date(abertura.getTime() + horas * 3_600_000);

const SEED = {
  CRITICA: { minutosResposta: 30, minutosResolucao: 8 * 60 },
  ALTA: { minutosResposta: 120, minutosResolucao: 24 * 60 },
  MEDIA: { minutosResposta: 240, minutosResolucao: 48 * 60 },
  BAIXA: { minutosResposta: 480, minutosResolucao: 72 * 60 },
};

describe('calcularPrazos', () => {
  it.each([
    ['CRITICA', 0.5, 8],
    ['ALTA', 2, 24],
    ['MEDIA', 4, 48],
    ['BAIXA', 8, 72],
  ] as const)('%s: resposta em %sh e resolução em %sh', (p, resp, resol) => {
    const prazos = calcularPrazos(abertura, SEED[p]);
    expect(prazos.venceRespostaEm).toEqual(h(resp));
    expect(prazos.venceResolucaoEm).toEqual(h(resol));
  });

  it('recalcula a partir da abertura somando o tempo já pausado', () => {
    // estava ALTA, ficou 90 min pausado e virou CRITICA
    const prazos = calcularPrazos(abertura, SEED.CRITICA, 90);
    expect(prazos.venceRespostaEm).toEqual(h(0.5));
    expect(prazos.venceResolucaoEm).toEqual(h(9.5));
  });
});

describe('retomarPrazo', () => {
  it('empurra o prazo de resolução pelo tempo parado', () => {
    const r = retomarPrazo(
      { venceResolucaoEm: h(8), pausadoEm: h(2), minutosPausados: 15 },
      h(5),
    );
    expect(r.minutosParados).toBe(180);
    expect(r.venceResolucaoEm).toEqual(h(11));
    expect(r.minutosPausados).toBe(195);
    expect(r.pausadoEm).toBeNull();
  });

  it('não muda nada se não estava pausado', () => {
    const r = retomarPrazo(
      { venceResolucaoEm: h(8), pausadoEm: null, minutosPausados: 0 },
      h(5),
    );
    expect(r.venceResolucaoEm).toEqual(h(8));
    expect(r.minutosParados).toBe(0);
  });
});

describe('prazoVencido', () => {
  const base: EstadoSla = {
    status: 'ABERTO',
    venceRespostaEm: h(0.5),
    venceResolucaoEm: h(8),
    respondidoEm: null,
    resolvidoEm: null,
  };

  it('no prazo', () => {
    expect(prazoVencido(base, h(0.25))).toBeNull();
  });

  it('resposta vencida sem resposta', () => {
    expect(prazoVencido(base, h(1))).toBe('resposta');
  });

  it('respondido a tempo não vence a resposta depois', () => {
    const c = { ...base, status: 'EM_ATENDIMENTO', respondidoEm: h(0.2) };
    expect(prazoVencido(c, h(4))).toBeNull();
    expect(prazoVencido(c, h(9))).toBe('resolucao');
  });

  it('resposta atrasada conta como estouro', () => {
    const c = { ...base, status: 'EM_ATENDIMENTO', respondidoEm: h(0.75) };
    expect(prazoVencido(c, h(1))).toBe('resposta');
  });

  it('resolução não vence enquanto aguarda o cliente', () => {
    const c = { ...base, status: 'AGUARDANDO_CLIENTE', respondidoEm: h(0.2) };
    expect(prazoVencido(c, h(20))).toBeNull();
  });

  it('resolvido dentro do prazo nunca vence', () => {
    const c = {
      ...base,
      status: 'RESOLVIDO',
      respondidoEm: h(0.2),
      resolvidoEm: h(7),
    };
    expect(prazoVencido(c, h(100))).toBeNull();
  });

  it('cancelado nunca vence', () => {
    expect(prazoVencido({ ...base, status: 'CANCELADO' }, h(100))).toBeNull();
  });
});
