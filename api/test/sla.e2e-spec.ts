import {
  Contexto,
  criarApp,
  jobsNaFila,
  novoChamado,
  prepararBanco,
  tokens,
} from './helpers';

describe('Regras de SLA (e2e)', () => {
  let ctx: Contexto;
  let t: Awaited<ReturnType<typeof tokens>>;

  beforeAll(async () => {
    ctx = await criarApp();
  });
  beforeEach(async () => {
    await prepararBanco(ctx);
    t = await tokens(ctx);
  });
  afterAll(() => ctx.app.close());

  const abrir = async (prioridade = 'CRITICA') =>
    (
      await ctx
        .http()
        .post('/chamados')
        .set('Authorization', t.cliAcme)
        .send({ ...novoChamado, prioridade })
        .expect(201)
    ).body.id as string;

  it('verificação marca vencidos uma vez, grava histórico e enfileira e-mail', async () => {
    const id = await abrir('CRITICA');
    await abrir('BAIXA');
    ctx.relogio.avancarMinutos(31);

    const r1 = await ctx
      .http()
      .post('/sla/verificar')
      .set('Authorization', t.gestor)
      .expect(200);
    expect(r1.body.marcados).toBe(1);
    const r2 = await ctx
      .http()
      .post('/sla/verificar')
      .set('Authorization', t.gestor)
      .expect(200);
    expect(r2.body.marcados).toBe(0);

    const { body } = await ctx
      .http()
      .get(`/chamados/${id}`)
      .set('Authorization', t.gestor);
    expect(body.slaEstourado).toBe(true);
    const evento = body.eventos.find(
      (e: { tipo: string }) => e.tipo === 'SLA_ESTOURADO',
    );
    expect(evento.valorNovo).toBe('resposta');
    expect(await jobsNaFila(ctx)).toContain('sla-estourado');
  });

  it('não vence a resolução enquanto aguarda o cliente', async () => {
    const id = await abrir('CRITICA');
    await ctx
      .http()
      .post(`/chamados/${id}/assumir`)
      .set('Authorization', t.tec1);
    await ctx
      .http()
      .post(`/chamados/${id}/comentarios`)
      .set('Authorization', t.tec1)
      .send({ texto: 'Pode me mandar o log?' });
    await ctx
      .http()
      .patch(`/chamados/${id}/status`)
      .set('Authorization', t.tec1)
      .send({ status: 'AGUARDANDO_CLIENTE' })
      .expect(200);
    ctx.relogio.avancarMinutos(10 * 60);
    const r = await ctx
      .http()
      .post('/sla/verificar')
      .set('Authorization', t.gestor);
    expect(r.body.marcados).toBe(0);
  });

  it('mudar prioridade recalcula os prazos a partir da abertura', async () => {
    const id = await abrir('BAIXA');
    ctx.relogio.avancarMinutos(60);
    await ctx
      .http()
      .post(`/chamados/${id}/assumir`)
      .set('Authorization', t.tec1);
    const { body } = await ctx
      .http()
      .patch(`/chamados/${id}/prioridade`)
      .set('Authorization', t.tec1)
      .send({ prioridade: 'ALTA' })
      .expect(200);
    expect(body.venceRespostaEm).toBe('2026-03-10T14:00:00.000Z');
    expect(body.venceResolucaoEm).toBe('2026-03-11T12:00:00.000Z');
  });

  it('primeira resposta atrasada marca o SLA na hora', async () => {
    const id = await abrir('CRITICA');
    ctx.relogio.avancarMinutos(45);
    await ctx
      .http()
      .post(`/chamados/${id}/assumir`)
      .set('Authorization', t.tec1);
    await ctx
      .http()
      .post(`/chamados/${id}/comentarios`)
      .set('Authorization', t.tec1)
      .send({ texto: 'Desculpe a demora.' })
      .expect(201);
    const { body } = await ctx
      .http()
      .get(`/chamados/${id}`)
      .set('Authorization', t.gestor);
    expect(body.slaEstourado).toBe(true);
  });

  it('só o gestor edita políticas', async () => {
    const dto = { minutosResposta: 60, minutosResolucao: 600 };
    await ctx
      .http()
      .put('/sla/politicas/ALTA')
      .set('Authorization', t.tec1)
      .send(dto)
      .expect(403);
    const { body } = await ctx
      .http()
      .put('/sla/politicas/ALTA')
      .set('Authorization', t.gestor)
      .send(dto)
      .expect(200);
    expect(body.minutosResposta).toBe(60);
  });
});
