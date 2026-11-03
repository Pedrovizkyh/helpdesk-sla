import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Perfis } from '../auth/decorators/perfis.decorator';
import { UsuarioAtual } from '../auth/decorators/usuario-atual.decorator';
import type { UsuarioLogado } from '../auth/usuario-logado';
import { ChamadosService } from './chamados.service';
import { CriarChamadoDto } from './dto/criar-chamado.dto';
import { ListarChamadosDto } from './dto/listar-chamados.dto';
import { ComentarDto } from './dto/comentar.dto';

@ApiTags('chamados')
@ApiBearerAuth()
@Controller('chamados')
export class ChamadosController {
  constructor(private readonly chamados: ChamadosService) {}

  @Perfis('CLIENTE', 'GESTOR')
  @Post()
  abrir(@UsuarioAtual() u: UsuarioLogado, @Body() dto: CriarChamadoDto) {
    return this.chamados.abrir(u, dto);
  }

  @Get()
  listar(
    @UsuarioAtual() u: UsuarioLogado,
    @Query() filtros: ListarChamadosDto,
  ) {
    return this.chamados.listar(u, filtros);
  }

  @Get(':id')
  detalhar(@UsuarioAtual() u: UsuarioLogado, @Param('id') id: string) {
    return this.chamados.detalhar(u, id);
  }

  @Post(':id/comentarios')
  comentar(
    @UsuarioAtual() u: UsuarioLogado,
    @Param('id') id: string,
    @Body() dto: ComentarDto,
  ) {
    return this.chamados.comentar(u, id, dto);
  }
}
