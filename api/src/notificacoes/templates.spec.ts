import { emailRespostaTecnico, emailSlaEstourado } from './templates';

const c = {
  id: 'abc',
  numero: 42,
  titulo: 'VPN <fora>',
  prioridade: 'ALTA',
  empresa: 'Acme',
};

describe('templates de e-mail', () => {
  it('escapa HTML vindo do usuário', () => {
    const { html } = emailRespostaTecnico(
      c,
      'Rafael',
      '<script>x</script>',
      'http://web',
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('http://web/chamados/abc');
  });

  it('assunto do SLA indica o prazo vencido', () => {
    expect(emailSlaEstourado(c, 'resposta', 'http://web').assunto).toBe(
      '[#42] SLA de primeira resposta estourado',
    );
  });
});
