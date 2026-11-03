import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Prioridade } from '../../generated/prisma/enums';

export class CriarChamadoDto {
  @ApiProperty({ example: 'Sistema de faturamento fora do ar' })
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  titulo: string;

  @ApiProperty({ example: 'Ninguém consegue emitir notas desde as 9h.' })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  descricao: string;

  @ApiProperty({ example: 'Sistemas' })
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  categoria: string;

  @ApiProperty({ enum: Prioridade })
  @IsEnum(Prioridade)
  prioridade: Prioridade;

  @ApiPropertyOptional({
    description: 'Obrigatório para o gestor; o cliente usa a própria empresa',
  })
  @IsOptional()
  @IsString()
  empresaId?: string;
}
