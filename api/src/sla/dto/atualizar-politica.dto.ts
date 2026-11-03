import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class AtualizarPoliticaDto {
  @ApiProperty({ example: 30, description: 'Minutos para a primeira resposta' })
  @IsInt()
  @Min(5)
  @Max(7 * 24 * 60)
  minutosResposta: number;

  @ApiProperty({ example: 480, description: 'Minutos para a resolução' })
  @IsInt()
  @Min(15)
  @Max(60 * 24 * 60)
  minutosResolucao: number;
}
