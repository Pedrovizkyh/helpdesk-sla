import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { Perfis } from '../auth/decorators/perfis.decorator';
import { Prioridade } from '../generated/prisma/enums';
import { AtualizarPoliticaDto } from './dto/atualizar-politica.dto';
import { SlaService } from './sla.service';

@ApiTags('sla')
@ApiBearerAuth()
@Controller('sla/politicas')
export class SlaController {
  constructor(private readonly sla: SlaService) {}

  @Get()
  listar() {
    return this.sla.listarPoliticas();
  }

  @Perfis('GESTOR')
  @ApiParam({ name: 'prioridade', enum: Prioridade })
  @Put(':prioridade')
  atualizar(
    @Param('prioridade', new ParseEnumPipe(Prioridade)) prioridade: Prioridade,
    @Body() dto: AtualizarPoliticaDto,
  ) {
    return this.sla.atualizarPolitica(prioridade, dto);
  }
}
