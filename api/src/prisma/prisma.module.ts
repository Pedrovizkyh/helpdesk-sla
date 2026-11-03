import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Relogio } from '../common/relogio';

@Global()
@Module({
  providers: [PrismaService, Relogio],
  exports: [PrismaService, Relogio],
})
export class PrismaModule {}
