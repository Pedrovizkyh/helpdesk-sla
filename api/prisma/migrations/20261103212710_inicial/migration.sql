-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('CLIENTE', 'TECNICO', 'GESTOR');

-- CreateEnum
CREATE TYPE "Prioridade" AS ENUM ('CRITICA', 'ALTA', 'MEDIA', 'BAIXA');

-- CreateEnum
CREATE TYPE "StatusChamado" AS ENUM ('ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO_CLIENTE', 'RESOLVIDO', 'FECHADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('ABERTO', 'ATRIBUIDO', 'STATUS_ALTERADO', 'PRIORIDADE_ALTERADA', 'COMENTARIO', 'NOTA_INTERNA', 'PRIMEIRA_RESPOSTA', 'SLA_ESTOURADO');

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "empresaId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chamado" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "prioridade" "Prioridade" NOT NULL,
    "status" "StatusChamado" NOT NULL DEFAULT 'ABERTO',
    "venceRespostaEm" TIMESTAMP(3) NOT NULL,
    "venceResolucaoEm" TIMESTAMP(3) NOT NULL,
    "respondidoEm" TIMESTAMP(3),
    "resolvidoEm" TIMESTAMP(3),
    "pausadoEm" TIMESTAMP(3),
    "minutosPausados" INTEGER NOT NULL DEFAULT 0,
    "slaEstourado" BOOLEAN NOT NULL DEFAULT false,
    "empresaId" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "tecnicoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chamado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoliticaSla" (
    "id" TEXT NOT NULL,
    "prioridade" "Prioridade" NOT NULL,
    "minutosResposta" INTEGER NOT NULL,
    "minutosResolucao" INTEGER NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoliticaSla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comentario" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "interno" BOOLEAN NOT NULL DEFAULT false,
    "chamadoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoHistorico" (
    "id" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "valorAnterior" TEXT,
    "valorNovo" TEXT,
    "chamadoId" TEXT NOT NULL,
    "autorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_cnpj_key" ON "Empresa"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Chamado_numero_key" ON "Chamado"("numero");

-- CreateIndex
CREATE INDEX "Chamado_status_idx" ON "Chamado"("status");

-- CreateIndex
CREATE INDEX "Chamado_empresaId_idx" ON "Chamado"("empresaId");

-- CreateIndex
CREATE INDEX "Chamado_tecnicoId_idx" ON "Chamado"("tecnicoId");

-- CreateIndex
CREATE INDEX "Chamado_slaEstourado_status_idx" ON "Chamado"("slaEstourado", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PoliticaSla_prioridade_key" ON "PoliticaSla"("prioridade");

-- CreateIndex
CREATE INDEX "Comentario_chamadoId_idx" ON "Comentario"("chamadoId");

-- CreateIndex
CREATE INDEX "EventoHistorico_chamadoId_idx" ON "EventoHistorico"("chamadoId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chamado" ADD CONSTRAINT "Chamado_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chamado" ADD CONSTRAINT "Chamado_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chamado" ADD CONSTRAINT "Chamado_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_chamadoId_fkey" FOREIGN KEY ("chamadoId") REFERENCES "Chamado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoHistorico" ADD CONSTRAINT "EventoHistorico_chamadoId_fkey" FOREIGN KEY ("chamadoId") REFERENCES "Chamado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoHistorico" ADD CONSTRAINT "EventoHistorico_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
