import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Relogio } from '../common/relogio';
import type { UsuarioLogado } from '../auth/usuario-logado';
import { calcularPrazos } from '../sla/calculo-sla';
import { HistoricoService } from './historico.service';
import { escopoChamados, filtroComentarios, filtroEventos } from './escopo';
import { CriarChamadoDto } from './dto/criar-chamado.dto';
import { ListarChamadosDto } from './dto/listar-chamados.dto';
import { ComentarDto } from './dto/comentar.dto';

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

    const politica = await this.prisma.politicaSla.findUnique({
      where: { prioridade: dto.prioridade },
    });
    if (!politica) {
      throw new BadRequestException('Sem política de SLA para a prioridade');
    }

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
      return novo;
    });
    this.logger.info({ chamadoId: id, interno }, 'comentário registrado');
    return comentario;
  }
}
