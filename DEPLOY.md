# Deploy

Arquitetura no plano gratuito:

| Peça | Serviço | O que roda |
| --- | --- | --- |
| Banco | **Neon** (Postgres) | dados |
| Fila | **Upstash** (Redis) | fila `emails` do BullMQ |
| API | **Render** (web service free) | API + worker da fila + job de SLA, **no mesmo processo** |
| Front | **Vercel** | SPA React estática |

Ordem: Neon → Upstash → Render → Vercel → voltar no Render para ajustar o CORS → seed.

---

## 1. Neon (Postgres)

1. Crie um projeto em <https://console.neon.tech> (região próxima, ex.: `AWS São Paulo` ou `US East`).
2. Em **Connection Details**, copie a connection string **direta** (sem `-pooler` no host), com `?sslmode=require` no final.
   Ex.: `postgresql://usuario:senha@ep-xxx.sa-east-1.aws.neon.tech/neondb?sslmode=require`
3. Guarde: ela vira a `DATABASE_URL` do Render.

> A conexão direta é a mais simples para o `prisma migrate deploy`. Com um único processo, não precisa do pooler.

## 2. Upstash (Redis)

1. Crie um banco Redis em <https://console.upstash.com> (mesma região da API, se possível).
2. Copie a URL no formato **`rediss://default:SENHA@HOST:6379`** (com dois `s`: TLS).
3. Guarde: ela vira a `REDIS_URL` do Render.

> O plano grátis do Upstash limita comandos por mês. O worker já está configurado para ficar mais quieto quando a fila está vazia (`drainDelay: 30s`, `stalledInterval: 2min`). Se o limite apertar, desligue o worker com `RUN_WORKER=false` (os e-mails ficam enfileirados).

## 3. Render (API)

1. Em <https://dashboard.render.com>, **New → Blueprint** e aponte para este repositório. O `render.yaml` da raiz cria o serviço `helpdesk-sla-api`.
2. Preencha as variáveis marcadas como `sync: false`:

   | Variável | Valor |
   | --- | --- |
   | `DATABASE_URL` | string do Neon |
   | `REDIS_URL` | string `rediss://` do Upstash |
   | `CORS_ORIGINS` | por enquanto `http://localhost:5173` (troca no passo 5) |
   | `WEB_URL` | idem |

   `JWT_SECRET` é gerado automaticamente pelo Render. As demais já vêm do blueprint.
3. Faça o deploy. O build roda `npm ci --include=dev && npm run build`; a subida roda `prisma migrate deploy` e depois a API.
4. Teste: `https://SEU-SERVICO.onrender.com/health` deve responder `{"status":"ok"}` e o Swagger fica em `/docs`.

### Por que tudo num processo só?

O plano gratuito do Render não tem *background worker*. Por isso a API sobe o worker da fila quando `RUN_WORKER=true` e o agendador do job de SLA quando `RUN_SCHEDULER=true`. Em um plano pago, dá para separar: um serviço com `RUN_WORKER=false` (só API) e um *background worker* com o mesmo código e `RUN_WORKER=true`.

### Limitações do plano grátis

- O serviço **dorme após ~15 min sem acesso**. A primeira requisição demora ~1 min (o front mostra uma mensagem amigável).
- Enquanto dorme, o `@Cron` não roda. Ao acordar, a próxima verificação marca tudo que venceu nesse meio tempo. O gestor também pode forçar pelo Swagger com `POST /sla/verificar`.

## 4. Vercel (front)

1. Em <https://vercel.com/new>, importe o repositório.
2. **Root Directory**: `web`. O framework (Vite) é detectado e o `web/vercel.json` já tem o rewrite de SPA (todas as rotas → `index.html`).
3. Variável de ambiente: `VITE_API_URL = https://SEU-SERVICO.onrender.com` (sem barra no final).
4. Deploy. Anote a URL final (ex.: `https://helpdesk-sla.vercel.app`).

## 5. Ajustar o CORS no Render

Volte ao serviço no Render e troque:

- `CORS_ORIGINS` = URL do Vercel (pode listar várias separadas por vírgula, ex.: a de produção e a de preview)
- `WEB_URL` = URL do Vercel

Salve; o Render reinicia sozinho.

## 6. Seed em produção (dados de demonstração)

> ⚠️ O seed **apaga todos os dados** e recria empresas, usuários, políticas e 10 chamados. Por isso ele **não roda no build nem na subida**.

Rode da sua máquina, apontando para o Neon:

```bash
cd api
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" CONFIRMAR_SEED=sim npm run seed
```

`CONFIRMAR_SEED=sim` é obrigatório para qualquer banco que não seja `localhost` (trava de segurança). Rode de novo sempre que quiser "resetar" a demonstração; os prazos do seed são relativos ao momento em que ele roda.

## 7. E-mail em produção

Padrão: `EMAIL_ENABLED=false`. Os e-mails continuam passando pela fila, mas o worker só registra no log e não envia nada. Assim nenhum e-mail sai para os endereços do seed (que usam o domínio reservado `.test`).

Para ver os e-mails de verdade, use um SMTP de **teste** (Mailtrap Sandbox, Ethereal etc.) e configure:

```
EMAIL_ENABLED=true
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=...
SMTP_PASS=...
EMAIL_REDIRECT_TO=sua-caixa-de-teste@exemplo.com
```

Em produção a API **não sobe** com `EMAIL_ENABLED=true` sem `EMAIL_REDIRECT_TO`: todo e-mail é redirecionado para essa caixa, com os destinatários originais no assunto.

## Checklist

- [ ] `/health` responde no Render
- [ ] `/docs` abre o Swagger
- [ ] Front no Vercel faz login com os perfis de demonstração
- [ ] Recarregar uma rota interna (ex.: `/chamados/xyz`) não dá 404 (rewrite da SPA)
- [ ] Nenhum erro de CORS no console do navegador
- [ ] Seed rodado com `CONFIRMAR_SEED=sim`
