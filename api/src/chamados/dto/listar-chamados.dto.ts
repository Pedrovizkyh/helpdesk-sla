import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Prioridade, StatusChamado } from '../../generated/prisma/enums';

const lista = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.split(',').filter(Boolean) : value;
const booleano = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

export class ListarChamadosDto {
  @ApiPropertyOptional({
    enum: StatusChamado,
    isArray: true,
    description: 'Separe por vírgula',
  })
  @IsOptional()
  @Transform(lista)
  @IsEnum(StatusChamado, { each: true })
  status?: StatusChamado[];

  @ApiPropertyOptional({ enum: Prioridade, isArray: true })
  @IsOptional()
  @Transform(lista)
  @IsEnum(Prioridade, { each: true })
  prioridade?: Prioridade[];

  @ApiPropertyOptional({
    description: 'ID do técnico, ou "nenhum" para a fila sem dono',
  })
  @IsOptional()
  @IsString()
  tecnicoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(booleano)
  @IsBoolean()
  slaEstourado?: boolean;

  @ApiPropertyOptional({ description: 'Busca no título ou pelo número' })
  @IsOptional()
  @IsString()
  busca?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  porPagina: number = 20;
}
