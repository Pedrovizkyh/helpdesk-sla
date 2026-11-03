import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { Prioridade, StatusChamado } from '../../generated/prisma/enums';

export class MudarStatusDto {
  @ApiProperty({ enum: StatusChamado })
  @IsEnum(StatusChamado)
  status: StatusChamado;
}

export class AtribuirDto {
  @ApiProperty()
  @IsString()
  tecnicoId: string;
}

export class MudarPrioridadeDto {
  @ApiProperty({ enum: Prioridade })
  @IsEnum(Prioridade)
  prioridade: Prioridade;
}
