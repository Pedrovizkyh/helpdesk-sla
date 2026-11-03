import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './usuario-logado';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, senha: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
      include: { empresa: true },
    });
    const ok = usuario && (await bcrypt.compare(senha, usuario.senhaHash));
    if (!usuario || !ok || (usuario.empresa && !usuario.empresa.ativa)) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    const payload: JwtPayload = {
      sub: usuario.id,
      perfil: usuario.perfil,
      empresaId: usuario.empresaId,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      usuario: this.publico(usuario),
    };
  }

  async me(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: { empresa: true },
    });
    if (!usuario) throw new UnauthorizedException();
    return this.publico(usuario);
  }

  private publico(u: {
    id: string;
    nome: string;
    email: string;
    perfil: string;
    empresa: { id: string; nome: string } | null;
  }) {
    return {
      id: u.id,
      nome: u.nome,
      email: u.email,
      perfil: u.perfil,
      empresa: u.empresa ? { id: u.empresa.id, nome: u.empresa.nome } : null,
    };
  }
}
