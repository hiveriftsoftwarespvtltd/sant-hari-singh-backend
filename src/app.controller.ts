import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { MailService } from './modules/mail/mail.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly mailService: MailService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('consultation')
  async bookConsultation(@Body() body: { name: string; phone: string; concern: string }) {
    await this.mailService.sendConsultationEmail(body.name, body.phone, body.concern);
    return { success: true, message: 'Consultation request sent successfully' };
  }

  @Post('contact')
  async submitContact(
    @Body() body: { name: string; phone: string; email: string; concern: string; message: string },
  ) {
    await this.mailService.sendContactEmail(body.name, body.phone, body.email, body.concern, body.message);
    return { success: true, message: 'Contact request submitted successfully' };
  }
}
