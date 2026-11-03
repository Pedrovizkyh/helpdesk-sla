import { Injectable } from '@nestjs/common';

/** Fonte única de "agora". Nos testes é trocada por um relógio fixo. */
@Injectable()
export class Relogio {
  agora(): Date {
    return new Date();
  }
}
