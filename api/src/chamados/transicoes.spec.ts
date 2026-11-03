import {
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { StatusChamado } from '../generated/prisma/enums';
import {
  proximosStatus,
  transicaoExiste,
  validarTransicao,
} from './transicoes';

const TODOS = Object.values(StatusChamado);

const PERMITIDAS: [StatusChamado, StatusChamado][] = [
  ['ABERTO', 'EM_ATENDIMENTO'],
  ['ABERTO', 'CANCELADO'],
  ['EM_ATENDIMENTO', 'RESOLVIDO'],
  ['EM_ATENDIMENTO', 'AGUARDANDO_CLIENTE'],
  ['AGUARDANDO_CLIENTE', 'EM_ATENDIMENTO'],
  ['RESOLVIDO', 'FECHADO'],
  ['RESOLVIDO', 'EM_ATENDIMENTO'],
];

describe('transições de status', () => {
  it.each(PERMITIDAS)('permite %s → %s', (de, para) => {
    expect(transicaoExiste(de, para)).toBe(true);
  });

  const proibidas = TODOS.flatMap((de) =>
    TODOS.filter(
      (para) => !PERMITIDAS.some(([a, b]) => a === de && b === para),
    ).map((para) => [de, para] as const),
  );

  it.each(proibidas)('recusa %s → %s com 422', (de, para) => {
    expect(transicaoExiste(de, para)).toBe(false);
    expect(() => validarTransicao(de, para, 'GESTOR')).toThrow(
      UnprocessableEntityException,
    );
  });

  it('FECHADO e CANCELADO são finais', () => {
    expect(proximosStatus('FECHADO')).toEqual([]);
    expect(proximosStatus('CANCELADO')).toEqual([]);
  });

  describe('perfis', () => {
    it('só cliente ou gestor cancelam', () => {
      expect(() =>
        validarTransicao('ABERTO', 'CANCELADO', 'CLIENTE'),
      ).not.toThrow();
      expect(() =>
        validarTransicao('ABERTO', 'CANCELADO', 'GESTOR'),
      ).not.toThrow();
      expect(() => validarTransicao('ABERTO', 'CANCELADO', 'TECNICO')).toThrow(
        ForbiddenException,
      );
    });

    it('cliente não assume nem resolve', () => {
      expect(() =>
        validarTransicao('ABERTO', 'EM_ATENDIMENTO', 'CLIENTE'),
      ).toThrow(ForbiddenException);
      expect(() =>
        validarTransicao('EM_ATENDIMENTO', 'RESOLVIDO', 'CLIENTE'),
      ).toThrow(ForbiddenException);
    });

    it('cliente fecha, reabre e responde', () => {
      expect(() =>
        validarTransicao('RESOLVIDO', 'FECHADO', 'CLIENTE'),
      ).not.toThrow();
      expect(() =>
        validarTransicao('RESOLVIDO', 'EM_ATENDIMENTO', 'CLIENTE'),
      ).not.toThrow();
      expect(() =>
        validarTransicao('AGUARDANDO_CLIENTE', 'EM_ATENDIMENTO', 'CLIENTE'),
      ).not.toThrow();
    });

    it('técnico não fecha o próprio chamado', () => {
      expect(() => validarTransicao('RESOLVIDO', 'FECHADO', 'TECNICO')).toThrow(
        ForbiddenException,
      );
    });
  });
});
