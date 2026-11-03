import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Env } from '../config/env';
import type { EmailJob } from './constantes';

@Injectable()
export class MailerService implements OnModuleDestroy {
  private readonly transporter: Transporter;

  constructor(
    private readonly config: ConfigService<Env, true>,
    @InjectPinoLogger(MailerService.name) private readonly logger: PinoLogger,
  ) {
    const user = config.get('SMTP_USER', { infer: true });
    this.transporter = createTransport({
      host: config.get('SMTP_HOST'),
      port: config.get('SMTP_PORT'),
      secure: config.get('SMTP_SECURE'),
      auth: user
        ? { user, pass: config.get('SMTP_PASS', { infer: true }) }
        : undefined,
    });
  }

  async enviar(email: EmailJob) {
    if (!this.config.get('EMAIL_ENABLED')) {
      this.logger.info(
        { chamadoId: email.chamadoId, assunto: email.assunto },
        'e-mail desligado (EMAIL_ENABLED=false); envio ignorado',
      );
      return;
    }
    // Com redirecionamento, nenhum e-mail chega aos endereços reais/do seed
    const redirecionar = this.config.get('EMAIL_REDIRECT_TO', { infer: true });
    const para = redirecionar ? [redirecionar] : email.para;
    const assunto = redirecionar
      ? `${email.assunto} (para: ${email.para.join(', ')})`
      : email.assunto;

    await this.transporter.sendMail({
      from: this.config.get('EMAIL_FROM'),
      to: para,
      subject: assunto,
      html: email.html,
    });
  }

  onModuleDestroy() {
    this.transporter.close();
  }
}
