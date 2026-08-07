import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) { }

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
    const rawId = (orderId || '').trim();
    const formattedId = rawId.toUpperCase().startsWith('SHS-')
      ? rawId.toUpperCase()
      : (rawId.length > 6 ? `SHS-${rawId.slice(-6).toUpperCase()}` : `SHS-${rawId}`);

    const itemsListHtml = (items || []).map(item => `
      <tr style="border-bottom: 1px solid #EBF3EE;">
        <td style="padding: 12px; font-weight: bold; color: #1F3327;">${item.name || 'Ayurvedic Product'}</td>
        <td style="padding: 12px; text-align: center; color: #526D5B;">${item.quantity || 1}</td>
        <td style="padding: 12px; text-align: right; font-weight: bold; color: #0C3E26;">₹${item.price || 0}</td>
      </tr>
    `).join('');

    await this.mailerService.sendMail({
      to: email,
      subject: `Order Confirmed #${formattedId} — Saint Hari Singh`,
      html: `
        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; padding: 30px; max-width: 600px; margin: 0 auto; border: 1px solid #D5E5DA; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #EBF3EE;">
            <h2 style="color: #0C3E26; font-size: 24px; font-family: 'Georgia', serif; margin: 0; font-weight: bold;">SANT HARI SINGH</h2>
            <p style="color: #C9A84C; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px;">Prakritik Chikitsalaya & Ayurvedic Store</p>
          </div>

          <div style="padding: 24px 0;">
            <div style="background-color: #EBF3EE; border: 1px solid #CFDED5; padding: 12px 18px; border-radius: 12px; font-size: 14px; font-weight: bold; color: #0C3E26; margin-bottom: 20px; text-align: center;">
              ✅ Order Confirmed!
            </div>

            <p style="font-size: 15px; color: #1F3327; margin: 0 0 10px 0;">Hi <strong>${name || 'Valued Customer'}</strong>,</p>
            <p style="font-size: 14px; color: #526D5B; line-height: 1.6; margin: 0 0 20px 0;">Your health & wellness formulation order has been placed successfully.</p>
            
            <div style="background-color: #FAF9F6; border: 1px solid #D5E5DA; padding: 14px 18px; border-radius: 10px; margin-bottom: 20px; font-size: 14px; color: #0C3E26;">
              Order ID: <strong style="color: #0C3E26; font-size: 16px; letter-spacing: 0.5px;">#${formattedId}</strong>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
              <thead>
                <tr style="background-color: #FAF6EE; color: #0C3E26; text-align: left;">
                  <th style="padding: 10px 12px;">Product</th>
                  <th style="padding: 10px 12px; text-align: center;">Qty</th>
                  <th style="padding: 10px 12px; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsListHtml}
              </tbody>
              <tfoot>
                <tr style="background-color: #FAF6EE; font-weight: bold; color: #0C3E26;">
                  <td colspan="2" style="padding: 12px;">Total Payable Amount</td>
                  <td style="padding: 12px; text-align: right; font-size: 15px;">₹${totalAmount || 0}</td>
                </tr>
              </tfoot>
            </table>

            <p style="font-size: 13px; color: #526D5B; margin: 16px 0 0 0;">We will notify you as soon as your order is packed and dispatched for delivery.</p>
          </div>

          <div style="border-top: 1px solid #EBF3EE; padding-top: 16px; text-align: center; font-size: 12px; color: #889C8E;">
            <p style="margin: 0;">Thank you for shopping with Sant Hari Singh 🙏</p>
          </div>
        </div>
      `,
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

  async sendOrderCancellationEmail(
    email: string,
    name: string,
    orderId: string,
    totalAmount: number,
    reason?: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: `Order Cancelled #${orderId} — Saint Hari`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; border: 2px solid #c0392b; border-radius: 12px; background: #fdf6f6;">
          <h2 style="color: #0C3E26; font-family: 'Georgia', serif; border-bottom: 2px solid #c0392b; padding-bottom: 10px; margin-top: 0;">
            Order Cancelled ❌
          </h2>
          <p style="font-size: 15px; color: #2f3c34;">Dear <strong>${name}</strong>,</p>
          <p style="font-size: 14px; color: #2f3c34;">
            We're sorry to inform you that your order <strong>#${orderId}</strong> has been cancelled.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px;">
            <tr>
              <td style="padding: 10px; border: 1px solid #f5c6cb; font-weight: bold; background: #fde8e8; width: 35%;">Order ID:</td>
              <td style="padding: 10px; border: 1px solid #f5c6cb; color: #1a231e;"><strong>#${orderId}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #f5c6cb; font-weight: bold; background: #fde8e8;">Order Amount:</td>
              <td style="padding: 10px; border: 1px solid #f5c6cb; color: #1a231e;">₹${totalAmount}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #f5c6cb; font-weight: bold; background: #fde8e8;">Status:</td>
              <td style="padding: 10px; border: 1px solid #f5c6cb; color: #c0392b; font-weight: bold;">Cancelled</td>
            </tr>
            ${reason ? `<tr>
              <td style="padding: 10px; border: 1px solid #f5c6cb; font-weight: bold; background: #fde8e8;">Reason:</td>
              <td style="padding: 10px; border: 1px solid #f5c6cb; color: #1a231e;">${reason}</td>
            </tr>` : ''}
          </table>
          <p style="font-size: 14px; color: #2f3c34;">
            If you paid online, any amount deducted will be refunded within <strong>5–7 business days</strong>.
          </p>
          <p style="font-size: 14px; color: #2f3c34;">
            For any questions, contact us at 
            <a href="mailto:info@santharisingh.com" style="color: #0C3E26;">info@santharisingh.com</a>
          </p>
          <p style="font-size: 14px; color: #2f3c34;">Regards,<br/><strong>Team Saint Hari</strong></p>
          <p style="font-size: 11px; color: #888; margin-top: 20px; border-top: 1px solid #f5c6cb; padding-top: 10px;">
            Cancelled on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </p>
        </div>
      `,
    });
  }

  async sendOrderStatusEmail(
    email: string,
    name: string,
    orderId: string,
    status: string,
  ): Promise<void> {
    const statusUpper = status.toUpperCase();
    let statusText = `Your order #${orderId} status has been updated to: ${statusUpper}`;
    let bgHeader = '#0C3E26';

    if (status === 'packed') {
      statusText = `📦 Good news! Your order #${orderId} has been carefully packed and is ready for dispatch.`;
    } else if (status === 'shipped') {
      statusText = `🚚 Great news! Your order #${orderId} has been shipped and is on its way to you.`;
    } else if (status === 'delivered') {
      statusText = `🎉 Your order #${orderId} has been successfully delivered. Thank you for choosing Saint Hari!`;
      bgHeader = '#27AE60';
    } else if (status === 'confirmed') {
      statusText = `✅ Your order #${orderId} is confirmed and is being processed by our Ayurvedic store.`;
    }

    await this.mailerService.sendMail({
      to: email,
      subject: `Order Status Update: ${statusUpper} #${orderId} — Saint Hari`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; border: 2px solid ${bgHeader}; border-radius: 12px; background: #FAF9F6;">
          <h2 style="color: ${bgHeader}; font-family: 'Georgia', serif; border-bottom: 2px solid ${bgHeader}; padding-bottom: 10px; margin-top: 0;">
            Order Status Update 📦
          </h2>
          <p style="font-size: 15px; color: #2f3c34;">Dear <strong>${name}</strong>,</p>
          <p style="font-size: 14px; color: #2f3c34; line-height: 1.5;">
            ${statusText}
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px;">
            <tr>
              <td style="padding: 10px; border: 1px solid #D1E0D5; font-weight: bold; background: #EBF3EE; width: 35%;">Order ID:</td>
              <td style="padding: 10px; border: 1px solid #D1E0D5; color: #1a231e;"><strong>#${orderId}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #D1E0D5; font-weight: bold; background: #EBF3EE;">Current Status:</td>
              <td style="padding: 10px; border: 1px solid #D1E0D5; color: ${bgHeader}; font-weight: bold;">${statusUpper}</td>
            </tr>
          </table>
          <p style="font-size: 14px; color: #2f3c34;">
            For any queries regarding your order, feel free to contact customer support at 
            <a href="mailto:info@santharisingh.com" style="color: #0C3E26;">info@santharisingh.com</a>
          </p>
          <p style="font-size: 14px; color: #2f3c34;">Warm regards,<br/><strong>Team Saint Hari Singh</strong></p>
          <p style="font-size: 11px; color: #888; margin-top: 20px; border-top: 1px solid #D1E0D5; padding-top: 10px;">
            Updated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </p>
        </div>
      `,
    });
  }
}
