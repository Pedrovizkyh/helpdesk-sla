import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Chamado, Prisma } from '../generated/prisma/client';
import type { Prioridade, StatusChamado } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { Relogio } from '../common/relogio';
import type { UsuarioLogado } from '../auth/usuario-logado';
import { calcularPrazos, prazoVencido, retomarPrazo } from '../sla/calculo-sla';
import { SlaService } from '../sla/sla.service';
import { HistoricoService } from './historico.service';
import { escopoChamados, filtroComentarios, filtroEventos } from './escopo';
import { CriarChamadoDto } from './dto/criar-chamado.dto';
import { ListarChamadosDto } from './dto/listar-chamados.dto';
import { ComentarDto } from './dto/comentar.dto';
import { validarTransicao } from './transicoes';

type Tx = Prisma.TransactionClient;

const pessoa = { select: { id: true, nome: true, perfil: true } } as const;

export const incluirResumo = {
  solicitante: pessoa,
  tecnico: pessoa,
  empresa: { select: { id: true, nome: true } },
} satisfies Prisma.ChamadoInclude;

@Injectable()
export class ChamadosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly relogio: Relogio,
    private readonly historico: HistoricoService,
    private readonly sla: SlaService,
    @InjectPinoLogger(ChamadosService.name)
    private readonly logger: PinoLogger,
  ) {}

  async abrir(u: UsuarioLogado, dto: CriarChamadoDto) {
    const empresaId = u.perfil === 'CLIENTE' ? u.empresaId : dto.empresaId;
    if (!empresaId) throw new BadRequestException('Informe a empresa');
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });
    if (!empresa?.ativa) throw new BadRequestException('Empresa inválida');

    const politica = await this.sla.politicaDe(dto.prioridade);

    const agora = this.relogio.agora();
    const chamado = await this.prisma.chamado.create({
      data: {
        titulo: dto.titulo,
        descricao: dto.descricao,
        categoria: dto.categoria,
        prioridade: dto.prioridade,
        empresaId,
        solicitanteId: u.id,
        criadoEm: agora,
        ...calcularPrazos(agora, politica),
        eventos: {
          create: {
            tipo: 'ABERTO',
            autorId: u.id,
            valorNovo: 'ABERTO',
            criadoEm: agora,
          },
        },
      },
      include: incluirResumo,
    });
    this.logger.info(
      { chamadoId: chamado.id, prioridade: chamado.prioridade },
      'chamado aberto',
    );
    return chamado;
  }

  async listar(u: UsuarioLogado, f: ListarChamadosDto) {
    const filtros: Prisma.ChamadoWhereInput[] = [escopoChamados(u)];
    if (f.status?.length) filtros.push({ status: { in: f.status } });
    if (f.prioridade?.length)
      filtros.push({ prioridade: { in: f.prioridade } });
    if (f.tecnicoId) {
      filtros.push({
        tecnicoId: f.tecnicoId === 'nenhum' ? null : f.tecnicoId,
      });
    }
    if (f.slaEstourado !== undefined) {
      filtros.push({ slaEstourado: f.slaEstourado });
    }
    if (f.busca?.trim()) {
      const termo = f.busca.trim().replace(/^#/, '');
      const numero = Number(termo);
      filtros.push({
        OR: [
          { titulo: { contains: termo, mode: 'insensitive' } },
          ...(Number.isInteger(numero) ? [{ numero }] : []),
        ],
      });
    }
    const where: Prisma.ChamadoWhereInput = { AND: filtros };
    const [itens, total] = await this.prisma.$transaction([
      this.prisma.chamado.findMany({
        where,
        include: {
          ...incluirResumo,
          _count: { select: { comentarios: { where: filtroComentarios(u) } } },
        },
        orderBy: { criadoEm: 'desc' },
        skip: (f.pagina - 1) * f.porPagina,
        take: f.porPagina,
      }),
      this.prisma.chamado.count({ where }),
    ]);
    return { itens, total, pagina: f.pagina, porPagina: f.porPagina };
  }

  /** Busca respeitando o escopo do usuário; fora do escopo vira 404. */
  async buscarVisivel(u: UsuarioLogado, id: string) {
    const chamado = await this.prisma.chamado.findFirst({
      where: { AND: [{ id }, escopoChamados(u)] },
    });
    if (!chamado) throw new NotFoundException('Chamado não encontrado');
    return chamado;
  }

  async detalhar(u: UsuarioLogado, id: string) {
    const chamado = await this.prisma.chamado.findFirst({
      where: { AND: [{ id }, escopoChamados(u)] },
      include: {
        ...incluirResumo,
        comentarios: {
          where: filtroComentarios(u),
          include: { autor: pessoa },
          orderBy: { criadoEm: 'asc' },
        },
        eventos: {
          where: filtroEventos(u),
          include: { autor: pessoa },
          orderBy: { criadoEm: 'asc' },
        },
      },
    });
    if (!chamado) throw new NotFoundException('Chamado não encontrado');
    return chamado;
  }

  async comentar(u: UsuarioLogado, id: string, dto: ComentarDto) {
    const interno = dto.interno ?? false;
    if (interno && u.perfil === 'CLIENTE') {
      throw new ForbiddenException('Cliente não cria notas internas');
    }
    const chamado = await this.buscarVisivel(u, id);
    if (chamado.status === 'FECHADO' || chamado.status === 'CANCELADO') {
      throw new BadRequestException('Chamado encerrado não recebe comentários');
    }
    const agora = this.relogio.agora();
    const equipe = u.perfil !== 'CLIENTE';
    const primeiraResposta = equipe && !interno && !chamado.respondidoEm;
    const clienteRespondeu =
      u.perfil === 'CLIENTE' && chamado.status === 'AGUARDANDO_CLIENTE';

    const comentario = await this.prisma.$transaction(async (tx) => {
      const novo = await tx.comentario.create({
        data: {
          chamadoId: id,
          autorId: u.id,
          texto: dto.texto,
          interno,
          criadoEm: agora,
        },
        include: { autor: pessoa },
      });
      await this.historico.registrar(
        {
          chamadoId: id,
          autorId: u.id,
          tipo: interno ? 'NOTA_INTERNA' : 'COMENTARIO',
          criadoEm: agora,
        },
        tx,
      );
      if (primeiraResposta) {
        await tx.chamado.update({
          where: { id },
          data: { respondidoEm: agora },
        });
        await this.historico.registrar(
          {
            chamadoId: id,
            autorId: u.id,
            tipo: 'PRIMEIRA_RESPOSTA',
            criadoEm: agora,
          },
          tx,
        );
      }
      if (clienteRespondeu) {
        await this.aplicarTransicao(tx, chamado, 'EM_ATENDIMENTO', u.id, agora);
      }
      return novo;
    });
    this.logger.info(
      { chamadoId: id, interno, primeiraResposta },
      'comentário registrado',
    );
    if (primeiraResposta && agora > chamado.venceRespostaEm) {
      await this.sla.marcarEstourado(id, 'resposta', agora);
    }
    return comentario;
  }

  async assumir(u: UsuarioLogado, id: string) {
    const chamado = await this.buscarVisivel(u, id);
    if (chamado.status !== 'ABERTO') {
      throw new UnprocessableEntityException(
        'Só chamados abertos podem ser assumidos',
      );
    }
    if (
      chamado.tecnicoId &&
      chamado.tecnicoId !== u.id &&
      u.perfil !== 'GESTOR'
    ) {
      throw new ForbiddenException('Chamado atribuído a outro técnico');
    }
    validarTransicao(chamado.status, 'EM_ATENDIMENTO', u.perfil);
    const agora = this.relogio.agora();
    await this.prisma.$transaction(async (tx) => {
      if (chamado.tecnicoId !== u.id) {
        await this.trocarTecnico(tx, chamado, u.id, u.id, agora);
      }
      await this.aplicarTransicao(tx, chamado, 'EM_ATENDIMENTO', u.id, agora);
    });
    this.logger.info({ chamadoId: id, tecnicoId: u.id }, 'chamado assumido');
    return this.resumo(id);
  }

  async atribuir(u: UsuarioLogado, id: string, tecnicoId: string) {
    const chamado = await this.buscarVisivel(u, id);
    if (chamado.status === 'FECHADO' || chamado.status === 'CANCELADO') {
      throw new UnprocessableEntityException('Chamado encerrado');
    }
    const tecnico = await this.prisma.usuario.findUnique({
      where: { id: tecnicoId },
    });
    if (!tecnico || tecnico.perfil === 'CLIENTE') {
      throw new BadRequestException('Técnico inválido');
    }
    if (chamado.tecnicoId === tecnicoId) return this.resumo(id);
    await this.prisma.$transaction((tx) =>
      this.trocarTecnico(tx, chamado, tecnicoId, u.id, this.relogio.agora()),
    );
    this.logger.info({ chamadoId: id, tecnicoId }, 'chamado atribuído');
    return this.resumo(id);
  }

  async mudarStatus(u: UsuarioLogado, id: string, para: StatusChamado) {
    const chamado = await this.buscarVisivel(u, id);
    validarTransicao(chamado.status, para, u.perfil);
    if (
      u.perfil === 'TECNICO' &&
      chamado.tecnicoId &&
      chamado.tecnicoId !== u.id
    ) {
      throw new ForbiddenException('Só o técnico responsável muda o status');
    }
    const agora = this.relogio.agora();
    await this.prisma.$transaction(async (tx) => {
      if (para === 'EM_ATENDIMENTO' && !chamado.tecnicoId) {
        await this.trocarTecnico(tx, chamado, u.id, u.id, agora);
      }
      await this.aplicarTransicao(tx, chamado, para, u.id, agora);
    });
    this.logger.info(
      { chamadoId: id, de: chamado.status, para },
      'status alterado',
    );
    if (para === 'RESOLVIDO') await this.conferirVencimento(id, agora);
    return this.resumo(id);
  }

  async mudarPrioridade(u: UsuarioLogado, id: string, prioridade: Prioridade) {
    const chamado = await this.buscarVisivel(u, id);
    if (
      u.perfil === 'TECNICO' &&
      chamado.tecnicoId &&
      chamado.tecnicoId !== u.id
    ) {
      throw new ForbiddenException(
        'Só o técnico responsável muda a prioridade',
      );
    }
    if (['RESOLVIDO', 'FECHADO', 'CANCELADO'].includes(chamado.status)) {
      throw new UnprocessableEntityException(
        'Não é possível mudar a prioridade de um chamado resolvido ou encerrado',
      );
    }
    if (chamado.prioridade === prioridade) return this.resumo(id);

    const politica = await this.sla.politicaDe(prioridade);
    const prazos = calcularPrazos(
      chamado.criadoEm,
      politica,
      chamado.minutosPausados,
    );
    const agora = this.relogio.agora();
    await this.prisma.$transaction(async (tx) => {
      await tx.chamado.update({
        where: { id },
        data: { prioridade, ...prazos },
      });
      await this.historico.registrar(
        {
          chamadoId: id,
          autorId: u.id,
          tipo: 'PRIORIDADE_ALTERADA',
          valorAnterior: chamado.prioridade,
          valorNovo: prioridade,
          criadoEm: agora,
        },
        tx,
      );
    });
    this.logger.info(
      { chamadoId: id, de: chamado.prioridade, para: prioridade },
      'prioridade alterada e prazos recalculados',
    );
    await this.conferirVencimento(id, agora);
    return this.resumo(id);
  }

  /** Marca na hora se a ação deixou o chamado fora do prazo (o job pega o resto). */
  private async conferirVencimento(id: string, agora: Date) {
    const atual = await this.prisma.chamado.findUniqueOrThrow({
      where: { id },
    });
    if (atual.slaEstourado) return;
    const tipo = prazoVencido(atual, agora);
    if (tipo) await this.sla.marcarEstourado(id, tipo, agora);
  }

  private resumo(id: string) {
    return this.prisma.chamado.findUniqueOrThrow({
      where: { id },
      include: incluirResumo,
    });
  }

  private async trocarTecnico(
    tx: Tx,
    chamado: Chamado,
    tecnicoId: string,
    autorId: string,
    agora: Date,
  ) {
    const [anterior, novo] = await Promise.all([
      chamado.tecnicoId
        ? tx.usuario.findUnique({ where: { id: chamado.tecnicoId } })
        : null,
      tx.usuario.findUniqueOrThrow({ where: { id: tecnicoId } }),
    ]);
    await tx.chamado.update({
      where: { id: chamado.id },
      data: { tecnicoId },
    });
    await this.historico.registrar(
      {
        chamadoId: chamado.id,
        autorId,
        tipo: 'ATRIBUIDO',
        valorAnterior: anterior?.nome ?? null,
        valorNovo: novo.nome,
        criadoEm: agora,
      },
      tx,
    );
  }

  /** Único ponto que grava mudança de status (com trava otimista no status atual). */
  private async aplicarTransicao(
    tx: Tx,
    chamado: Chamado,
    para: StatusChamado,
    autorId: string,
    agora: Date,
  ) {
    const data: Prisma.ChamadoUpdateManyMutationInput = { status: para };
    if (para === 'AGUARDANDO_CLIENTE') data.pausadoEm = agora;
    if (chamado.status === 'AGUARDANDO_CLIENTE') {
      const r = retomarPrazo(chamado, agora);
      data.venceResolucaoEm = r.venceResolucaoEm;
      data.minutosPausados = r.minutosPausados;
      data.pausadoEm = null;
      this.logger.info(
        { chamadoId: chamado.id, minutosParados: r.minutosParados },
        'prazo de resolução retomado',
      );
    }
    if (para === 'RESOLVIDO') data.resolvidoEm = agora;
    if (chamado.status === 'RESOLVIDO' && para === 'EM_ATENDIMENTO') {
      data.resolvidoEm = null;
    }
    const { count } = await tx.chamado.updateMany({
      where: { id: chamado.id, status: chamado.status },
      data,
    });
    if (count === 0) {
      throw new ConflictException(
        'O chamado mudou; recarregue e tente de novo',
      );
    }
    await this.historico.registrar(
      {
        chamadoId: chamado.id,
        autorId,
        tipo: 'STATUS_ALTERADO',
        valorAnterior: chamado.status,
        valorNovo: para,
        criadoEm: agora,
      },
      tx,
    );
  }
}
