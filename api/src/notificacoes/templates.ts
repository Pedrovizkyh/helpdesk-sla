const PRIORIDADES: Record<string, string> = {
  CRITICA: 'Crítica',
  ALTA: 'Alta',
  MEDIA: 'Média',
  BAIXA: 'Baixa',
};

const escapar = (t: string) =>
  t.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );

function layout(titulo: string, corpo: string, link: string) {
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#f4f4f7;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1f2330">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e6e6ec">
<tr><td style="padding:24px 28px;border-bottom:1px solid #eee"><strong style="color:#5b4bff">Helpdesk SLA</strong></td></tr>
<tr><td style="padding:28px"><h1 style="font-size:18px;margin:0 0 12px">${titulo}</h1>${corpo}
<p style="margin:24px 0 0"><a href="${link}" style="background:#5b4bff;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:14px">Abrir chamado</a></p>
</td></tr></table>
<p style="font-size:12px;color:#8a8fa3">E-mail automático. Não responda.</p>
</td></tr></table></body></html>`;
}

export interface DadosChamado {
  id: string;
  numero: number;
  titulo: string;
  prioridade: string;
  empresa: string;
}

const linha = (rotulo: string, valor: string) =>
  `<p style="margin:4px 0;font-size:14px"><span style="color:#8a8fa3">${rotulo}:</span> ${valor}</p>`;

export function emailChamadoAberto(c: DadosChamado, webUrl: string) {
  return {
    assunto: `[#${c.numero}] Novo chamado: ${c.titulo}`,
    html: layout(
      `Novo chamado #${c.numero}`,
      linha('Título', escapar(c.titulo)) +
        linha('Empresa', escapar(c.empresa)) +
        linha('Prioridade', PRIORIDADES[c.prioridade] ?? c.prioridade),
      `${webUrl}/chamados/${c.id}`,
    ),
  };
}

export function emailRespostaTecnico(
  c: DadosChamado,
  autor: string,
  texto: string,
  webUrl: string,
) {
  return {
    assunto: `[#${c.numero}] Nova resposta no seu chamado`,
    html: layout(
      `${escapar(autor)} respondeu o chamado #${c.numero}`,
      `<blockquote style="margin:0;padding:12px 16px;background:#f6f6fb;border-left:3px solid #5b4bff;border-radius:6px;font-size:14px;white-space:pre-wrap">${escapar(texto)}</blockquote>`,
      `${webUrl}/chamados/${c.id}`,
    ),
  };
}

export function emailSlaEstourado(
  c: DadosChamado,
  tipo: 'resposta' | 'resolucao',
  webUrl: string,
) {
  const prazo = tipo === 'resposta' ? 'primeira resposta' : 'resolução';
  return {
    assunto: `[#${c.numero}] SLA de ${prazo} estourado`,
    html: layout(
      `SLA estourado no chamado #${c.numero}`,
      linha('Prazo vencido', prazo) +
        linha('Título', escapar(c.titulo)) +
        linha('Empresa', escapar(c.empresa)) +
        linha('Prioridade', PRIORIDADES[c.prioridade] ?? c.prioridade),
      `${webUrl}/chamados/${c.id}`,
    ),
  };
}
