import {
  Contexto,
  criarApp,
  jobsNaFila,
  novoChamado,
  prepararBanco,
  tokens,
} from './helpers';

describe('Fluxo completo do chamado (e2e)', () => {
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

  it('cliente abre → técnico assume e responde → resolve → cliente fecha', async () => {
    const http = ctx.http;

    // 1. Cliente abre: prazos de ALTA (2h / 24h) a partir do relógio fixo
    const aberto = await http()
      .post('/chamados')
      .set('Authorization', t.cliAcme)
      .send(novoChamado)
      .expect(201);
    const id: string = aberto.body.id;
    expect(aberto.body.status).toBe('ABERTO');
    expect(aberto.body.venceRespostaEm).toBe('2026-03-10T14:00:00.000Z');
    expect(aberto.body.venceResolucaoEm).toBe('2026-03-11T12:00:00.000Z');
    expect(await jobsNaFila(ctx)).toEqual(['chamado-aberto']);

    // 2. Técnico assume
    ctx.relogio.avancarMinutos(10);
    const assumido = await http()
      .post(`/chamados/${id}/assumir`)
      .set('Authorization', t.tec1)
      .expect(200);
    expect(assumido.body.status).toBe('EM_ATENDIMENTO');
    expect(assumido.body.tecnico.nome).toBe('Tec Um');

    // 3. Técnico responde (primeira resposta) e deixa uma nota interna
    ctx.relogio.avancarMinutos(5);
    await http()
      .post(`/chamados/${id}/comentarios`)
      .set('Authorization', t.tec1)
      .send({ texto: 'Estou verificando o concentrador.' })
      .expect(201);
    await http()
      .post(`/chamados/${id}/comentarios`)
      .set('Authorization', t.tec1)
      .send({ texto: 'Certificado expirado.', interno: true })
      .expect(201);

    // 4. Pede informação: prazo de resolução pausa por 3h
    await http()
      .patch(`/chamados/${id}/status`)
      .set('Authorization', t.tec1)
      .send({ status: 'AGUARDANDO_CLIENTE' })
      .expect(200);
    ctx.relogio.avancarMinutos(180);

    // 5. Cliente responde: volta para atendimento e o prazo é empurrado em 3h
    await http()
      .post(`/chamados/${id}/comentarios`)
      .set('Authorization', t.cliAcme)
      .send({ texto: 'Segue o print do erro.' })
      .expect(201);
    const retomado = await http()
      .get(`/chamados/${id}`)
      .set('Authorization', t.tec1)
      .expect(200);
    expect(retomado.body.status).toBe('EM_ATENDIMENTO');
    expect(retomado.body.venceResolucaoEm).toBe('2026-03-11T15:00:00.000Z');
    expect(retomado.body.minutosPausados).toBe(180);
    expect(retomado.body.respondidoEm).toBe('2026-03-10T12:15:00.000Z');

    // 6. Técnico resolve; 7. cliente confirma e fecha
    await http()
      .patch(`/chamados/${id}/status`)
      .set('Authorization', t.tec1)
      .send({ status: 'RESOLVIDO' })
      .expect(200);
    const fechado = await http()
      .patch(`/chamados/${id}/status`)
      .set('Authorization', t.cliAcme)
      .send({ status: 'FECHADO' })
      .expect(200);
    expect(fechado.body.status).toBe('FECHADO');
    expect(fechado.body.slaEstourado).toBe(false);

    // Histórico completo, na ordem
    const detalhe = await http()
      .get(`/chamados/${id}`)
      .set('Authorization', t.gestor)
      .expect(200);
    const eventos = detalhe.body.eventos.map(
      (e: { tipo: string; valorNovo: string | null }) =>
        e.tipo === 'STATUS_ALTERADO' ? `STATUS:${e.valorNovo}` : e.tipo,
    );
    expect(eventos).toEqual([
      'ABERTO',
      'ATRIBUIDO',
      'STATUS:EM_ATENDIMENTO',
      'COMENTARIO',
      'PRIMEIRA_RESPOSTA',
      'NOTA_INTERNA',
      'STATUS:AGUARDANDO_CLIENTE',
      'COMENTARIO',
      'STATUS:EM_ATENDIMENTO',
      'STATUS:RESOLVIDO',
      'STATUS:FECHADO',
    ]);
    expect(await jobsNaFila(ctx)).toEqual([
      'chamado-aberto',
      'resposta-tecnico',
    ]);

    // Chamado fechado não aceita mais transições
    await http()
      .patch(`/chamados/${id}/status`)
      .set('Authorization', t.gestor)
      .send({ status: 'EM_ATENDIMENTO' })
      .expect(422);
  });

  it('recusa transição fora do ciclo com 422', async () => {
    const { body } = await ctx
      .http()
      .post('/chamados')
      .set('Authorization', t.cliAcme)
      .send(novoChamado)
      .expect(201);
    await ctx
      .http()
      .patch(`/chamados/${body.id}/status`)
      .set('Authorization', t.gestor)
      .send({ status: 'RESOLVIDO' })
      .expect(422);
  });
});
