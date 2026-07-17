import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Welcome to Saint Hari! 🙏',
      template: 'welcome',
      context: { name },
    });
  }

  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetUrl: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Password Reset Request — Saint Hari',
      template: 'reset-password',
      context: { name, resetUrl },
    });
  }

  async sendOrderConfirmationEmail(
    email: string,
    name: string,
    orderId: string,
    items: any[],
    totalAmount: number,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: `Order Confirmed #${orderId} — Saint Hari`,
      template: 'order-confirmation',
      context: { name, orderId, items, totalAmount },
    });
  }

  async sendOtpEmail(email: string, name: string, otp: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'One-Time Password (OTP) — Saint Hari',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; border: 1px solid #eee;">
          <h2 style="color: #0C3E26;">Saint Hari Ayurvedic Store</h2>
          <p>Hello ${name},</p>
          <p>You requested a password reset. Your One-Time Password (OTP) is:</p>
          <div style="font-size: 24px; font-weight: bold; background: #f4f4f4; padding: 10px 20px; display: inline-block; letter-spacing: 2px; color: #0C3E26;">
            ${otp}
          </div>
          <p>This OTP is valid for 15 minutes. Please do not share this OTP with anyone.</p>
          <p>Regards,<br/>Team Saint Hari</p>
        </div>
      `,
    });
  }

  async sendRegistrationOtpEmail(email: string, name: string, otp: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Verify Your Email Address — Saint Hari',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; border: 1px solid #eee;">
          <h2 style="color: #0C3E26;">Saint Hari Ayurvedic Store</h2>
          <p>Hello ${name},</p>
          <p>Thank you for registering at Saint Hari. Your One-Time Password (OTP) to verify and activate your account is:</p>
          <div style="font-size: 24px; font-weight: bold; background: #EBF3EE; padding: 10px 20px; display: inline-block; letter-spacing: 2px; color: #0C3E26;">
            ${otp}
          </div>
          <p>This OTP is valid for 15 minutes. Please do not share this OTP with anyone.</p>
          <p>Regards,<br/>Team Saint Hari</p>
        </div>
      `,
    });
  }


  async sendConsultationEmail(name: string, age: string, phone: string, concern: string, paymentId: string): Promise<void> {
    await this.mailerService.sendMail({
      to: 'vineetvineet8006@gmail.com',
      subject: 'New Paid Ayurvedic Consultation Request! 💳',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; border: 2px solid #0C3E26; border-radius: 12px; background: #FAF9F6;">
          <h2 style="color: #0C3E26; font-family: 'Georgia', serif; border-bottom: 2px solid #0C3E26; padding-bottom: 10px; margin-top: 0;">New Consultation Request</h2>
          <p style="font-size: 14px; color: #2F3C34;">A user has submitted a paid request for a free Ayurvedic consultation from the website:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
            <tr>
              <td style="padding: 10px; border: 1px solid #D1E0D5; font-weight: bold; background: #EBF3EE; width: 35%;">Full Name:</td>
              <td style="padding: 10px; border: 1px solid #D1E0D5; color: #1A231E;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #D1E0D5; font-weight: bold; background: #EBF3EE;">Age:</td>
              <td style="padding: 10px; border: 1px solid #D1E0D5; color: #1A231E;">${age}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #D1E0D5; font-weight: bold; background: #EBF3EE;">Phone Number:</td>
              <td style="padding: 10px; border: 1px solid #D1E0D5; color: #1A231E; font-weight: bold;">${phone}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #D1E0D5; font-weight: bold; background: #EBF3EE;">Health Concern:</td>
              <td style="padding: 10px; border: 1px solid #D1E0D5; color: #1A231E;">${concern}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #D1E0D5; font-weight: bold; background: #EBF3EE;">Payment Status:</td>
              <td style="padding: 10px; border: 1px solid #D1E0D5; color: #27AE60; font-weight: bold;">Paid (₹199) ✅</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #D1E0D5; font-weight: bold; background: #EBF3EE;">Payment ID:</td>
              <td style="padding: 10px; border: 1px solid #D1E0D5; color: #1A231E; font-weight: bold;">${paymentId}</td>
            </tr>
          </table>
          <p style="font-size: 12px; color: #888; margin-top: 25px; border-top: 1px solid #D1E0D5; padding-top: 10px;">
            Submitted on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </p>
        </div>
      `,
    });
  }

  async sendContactEmail(name: string, phone: string, email: string, concern: string, message: string): Promise<void> {
    await this.mailerService.sendMail({
      to: 'vineetvineet8006@gmail.com',
      subject: 'New Website Inquiry / Contact Request! ✉️',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; border: 2px solid #0c3e26; border-radius: 12px; background: #faf9f6;">
          <h2 style="color: #0c3e26; font-family: 'Georgia', serif; border-bottom: 2px solid #0c3e26; padding-bottom: 10px; margin-top: 0;">New Contact Form Inquiry</h2>
          <p style="font-size: 14px; color: #2f3c34;">A user has submitted a new inquiry / contact request from the Contact page:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
            <tr>
              <td style="padding: 10px; border: 1px solid #d1e0d5; font-weight: bold; background: #ebf3ee; width: 35%;">Name:</td>
              <td style="padding: 10px; border: 1px solid #d1e0d5; color: #1a231e;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #d1e0d5; font-weight: bold; background: #ebf3ee;">Phone:</td>
              <td style="padding: 10px; border: 1px solid #d1e0d5; color: #1a231e; font-weight: bold;">${phone}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #d1e0d5; font-weight: bold; background: #ebf3ee;">Email:</td>
              <td style="padding: 10px; border: 1px solid #d1e0d5; color: #1a231e;">${email || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #d1e0d5; font-weight: bold; background: #ebf3ee;">Concern:</td>
              <td style="padding: 10px; border: 1px solid #d1e0d5; color: #1a231e;">${concern}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #d1e0d5; font-weight: bold; background: #ebf3ee; vertical-align: top;">Message:</td>
              <td style="padding: 10px; border: 1px solid #d1e0d5; color: #1a231e; white-space: pre-wrap;">${message || 'None'}</td>
            </tr>
          </table>
          <p style="font-size: 12px; color: #888; margin-top: 25px; border-top: 1px solid #d1e0d5; padding-top: 10px;">
            Submitted on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </p>
        </div>
      `,
    });
  }
}
