import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { Perfis } from '../auth/decorators/perfis.decorator';
import { Prioridade } from '../generated/prisma/enums';
import { AtualizarPoliticaDto } from './dto/atualizar-politica.dto';
import { SlaService } from './sla.service';
import { VerificacaoSlaService } from './verificacao-sla.service';

@ApiTags('sla')
@ApiBearerAuth()
@Controller('sla')
export class SlaController {
  constructor(
    private readonly sla: SlaService,
    private readonly verificacao: VerificacaoSlaService,
  ) {}

  @Get('politicas')
  listar() {
    return this.sla.listarPoliticas();
  }

  @Perfis('GESTOR')
  @ApiParam({ name: 'prioridade', enum: Prioridade })
  @Put('politicas/:prioridade')
  atualizar(
    @Param('prioridade', new ParseEnumPipe(Prioridade)) prioridade: Prioridade,
    @Body() dto: AtualizarPoliticaDto,
  ) {
    return this.sla.atualizarPolitica(prioridade, dto);
  }

  /** Roda a mesma verificação do job agora (útil para demonstração). */
  @Perfis('GESTOR')
  @Post('verificar')
  @HttpCode(200)
  async verificar() {
    return { marcados: await this.verificacao.verificar() };
  }
}
