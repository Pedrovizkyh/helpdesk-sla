import {
  Contexto,
  criarApp,
  novoChamado,
  prepararBanco,
  tokens,
} from './helpers';

describe('Permissões (e2e)', () => {
  let ctx: Contexto;
  let t: Awaited<ReturnType<typeof tokens>>;
  let idAcme: string;

  beforeAll(async () => {
    ctx = await criarApp();
  });
  beforeEach(async () => {
    await prepararBanco(ctx);
    t = await tokens(ctx);
    idAcme = (
      await ctx
        .http()
        .post('/chamados')
        .set('Authorization', t.cliAcme)
        .send(novoChamado)
        .expect(201)
    ).body.id;
    await ctx
      .http()
      .post(`/chamados/${idAcme}/assumir`)
      .set('Authorization', t.tec1)
      .expect(200);
    await ctx
      .http()
      .post(`/chamados/${idAcme}/comentarios`)
      .set('Authorization', t.tec1)
      .send({ texto: 'Resposta pública' })
      .expect(201);
    await ctx
      .http()
      .post(`/chamados/${idAcme}/comentarios`)
      .set('Authorization', t.tec1)
      .send({ texto: 'SEGREDO interno', interno: true })
      .expect(201);
  });
  afterAll(() => ctx.app.close());

  it('sem token retorna 401', async () => {
    await ctx.http().get('/chamados').expect(401);
  });

  describe('cliente de outra empresa', () => {
    it('não vê o chamado no detalhe (404)', async () => {
      await ctx
        .http()
        .get(`/chamados/${idAcme}`)
        .set('Authorization', t.cliNimbus)
        .expect(404);
    });

    it('não vê o chamado na lista', async () => {
      const { body } = await ctx
        .http()
        .get('/chamados')
        .set('Authorization', t.cliNimbus)
        .expect(200);
      expect(body.total).toBe(0);
    });

    it('não comenta nem muda status', async () => {
      await ctx
        .http()
        .post(`/chamados/${idAcme}/comentarios`)
        .set('Authorization', t.cliNimbus)
        .send({ texto: 'oi' })
        .expect(404);
      await ctx
        .http()
        .patch(`/chamados/${idAcme}/status`)
        .set('Authorization', t.cliNimbus)
        .send({ status: 'CANCELADO' })
        .expect(404);
    });
  });

  describe('notas internas', () => {
    it('cliente não recebe nota interna nem evento dela', async () => {
      const { body } = await ctx
        .http()
        .get(`/chamados/${idAcme}`)
        .set('Authorization', t.cliAcme)
        .expect(200);
      expect(body.comentarios).toHaveLength(1);
      expect(JSON.stringify(body)).not.toContain('SEGREDO');
      expect(
        body.eventos.some((e: { tipo: string }) => e.tipo === 'NOTA_INTERNA'),
      ).toBe(false);
    });

    it('contagem de comentários na lista ignora notas internas para o cliente', async () => {
      const { body } = await ctx
        .http()
        .get('/chamados')
        .set('Authorization', t.cliAcme);
      expect(body.itens[0]._count.comentarios).toBe(1);
    });

    it('técnico e gestor veem a nota interna', async () => {
      const { body } = await ctx
        .http()
        .get(`/chamados/${idAcme}`)
        .set('Authorization', t.gestor);
      expect(body.comentarios).toHaveLength(2);
    });

    it('cliente não cria nota interna', async () => {
      await ctx
        .http()
        .post(`/chamados/${idAcme}/comentarios`)
        .set('Authorization', t.cliAcme)
        .send({ texto: 'tentativa', interno: true })
        .expect(403);
    });
  });

  describe('perfis', () => {
    it('técnico não vê chamado atribuído a outro técnico', async () => {
      await ctx
        .http()
        .get(`/chamados/${idAcme}`)
        .set('Authorization', t.tec2)
        .expect(404);
    });

    it('técnico não abre chamado nem atribui', async () => {
      await ctx
        .http()
        .post('/chamados')
        .set('Authorization', t.tec1)
        .send(novoChamado)
        .expect(403);
      await ctx
        .http()
        .patch(`/chamados/${idAcme}/atribuir`)
        .set('Authorization', t.tec1)
        .send({ tecnicoId: 'x' })
        .expect(403);
    });

    it('cliente não assume nem vê métricas', async () => {
      await ctx
        .http()
        .post(`/chamados/${idAcme}/assumir`)
        .set('Authorization', t.cliAcme)
        .expect(403);
      await ctx
        .http()
        .get('/metricas')
        .set('Authorization', t.cliAcme)
        .expect(403);
    });

    it('técnico não cancela; cliente cancela o próprio chamado aberto', async () => {
      const novo = (
        await ctx
          .http()
          .post('/chamados')
          .set('Authorization', t.cliAcme)
          .send(novoChamado)
      ).body.id;
      await ctx
        .http()
        .patch(`/chamados/${novo}/status`)
        .set('Authorization', t.tec1)
        .send({ status: 'CANCELADO' })
        .expect(403);
      await ctx
        .http()
        .patch(`/chamados/${novo}/status`)
        .set('Authorization', t.cliAcme)
        .send({ status: 'CANCELADO' })
        .expect(200);
    });

    it('gestor vê métricas', async () => {
      const { body } = await ctx
        .http()
        .get('/metricas')
        .set('Authorization', t.gestor)
        .expect(200);
      expect(body.total).toBeGreaterThan(0);
    });
  });
});
