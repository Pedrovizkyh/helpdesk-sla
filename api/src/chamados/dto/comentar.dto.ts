import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ComentarDto {
  @ApiProperty({ example: 'Já estou verificando, retorno em breve.' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  texto: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Nota interna: só técnico e gestor veem',
  })
  @IsOptional()
  @IsBoolean()
  interno?: boolean;
}
