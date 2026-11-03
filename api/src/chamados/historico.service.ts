import { Injectable } from '@nestjs/common';
import type { Prisma, TipoEvento } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Cliente = Prisma.TransactionClient | PrismaService;

export interface NovoEvento {
  chamadoId: string;
  tipo: TipoEvento;
  autorId?: string | null;
  valorAnterior?: string | null;
  valorNovo?: string | null;
  criadoEm?: Date;
}

@Injectable()
export class HistoricoService {
  constructor(private readonly prisma: PrismaService) {}

  registrar(evento: NovoEvento, db: Cliente = this.prisma) {
    return db.eventoHistorico.create({ data: evento });
  }
}
