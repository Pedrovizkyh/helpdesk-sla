import { agregarMetricas, type LinhaMetrica } from './agregar';

const t = (iso: string) => new Date(iso);
const tec = { id: 't1', nome: 'Rafael' };
const base: LinhaMetrica = {
  status: 'ABERTO',
  prioridade: 'ALTA',
  criadoEm: t('2026-03-01T10:00:00Z'),
  respondidoEm: null,
  resolvidoEm: null,
  minutosPausados: 0,
  slaEstourado: false,
  tecnico: null,
};

describe('agregarMetricas', () => {
  const linhas: LinhaMetrica[] = [
    base,
    {
      ...base,
      status: 'FECHADO',
      respondidoEm: t('2026-03-01T10:30:00Z'),
      resolvidoEm: t('2026-03-01T14:00:00Z'),
      minutosPausados: 60,
      tecnico: tec,
    },
    {
      ...base,
      status: 'RESOLVIDO',
      criadoEm: t('2026-03-02T10:00:00Z'),
      respondidoEm: t('2026-03-02T11:30:00Z'),
      resolvidoEm: t('2026-03-02T12:00:00Z'),
      slaEstourado: true,
      tecnico: tec,
    },
    { ...base, status: 'EM_ATENDIMENTO', slaEstourado: true, tecnico: tec },
  ];
  const m = agregarMetricas(
    linhas,
    t('2026-03-01T00:00:00Z'),
    t('2026-03-03T00:00:00Z'),
  );

  it('conta por status', () => {
    expect(m.porStatus.ABERTO).toBe(1);
    expect(m.porStatus.FECHADO).toBe(1);
    expect(m.porStatus.CANCELADO).toBe(0);
  });

  it('tempo médio de resolução desconta a pausa', () => {
    // (240 - 60) e 120 → média 150
    expect(m.tempoMedioResolucaoMin).toBe(150);
    expect(m.tempoMedioRespostaMin).toBe(60);
  });

  it('% dentro do SLA considera só concluídos', () => {
    expect(m.percentualDentroSla).toBe(50);
    expect(m.estouradosEmAberto).toBe(1);
  });

  it('agrupa por técnico e por dia', () => {
    expect(m.porTecnico).toEqual([
      { id: 't1', nome: 'Rafael', total: 3, resolvidos: 2, estourados: 2 },
    ]);
    expect(m.porDia.map((d) => d.dia)).toEqual([
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
    ]);
    expect(m.porDia[0]).toEqual({
      dia: '2026-03-01',
      abertos: 3,
      resolvidos: 1,
    });
  });

  it('sem concluídos, % é nulo', () => {
    expect(
      agregarMetricas([base], base.criadoEm, base.criadoEm).percentualDentroSla,
    ).toBeNull();
  });
});
