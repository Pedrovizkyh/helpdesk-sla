import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class PeriodoDto {
  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'Padrão: 30 dias atrás',
  })
  @IsOptional()
  @IsDateString()
  de?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'Padrão: agora' })
  @IsOptional()
  @IsDateString()
  ate?: string;
}
