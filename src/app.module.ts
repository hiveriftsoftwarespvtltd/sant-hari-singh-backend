import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { MailModule } from './modules/mail/mail.module';
import { UploadModule } from './modules/upload/upload.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { RawHerbSubCategoriesModule } from './modules/raw-herb-subcategories/raw-herb-subcategories.module';
import { ShiprocketModule } from './modules/shiprocket/shiprocket.module';

@Module({
  imports: [
    // Config Module - loads .env globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    //  Serve static uploads (images) — works on localhost AND server
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
      },
    }),

    // MongoDB Connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
        connectionFactory: (connection) => {
          connection.on('connected', () => {
            console.log(' MongoDB connected successfully');
          });
          connection.on('error', (err) => {
            console.error(' MongoDB connection error:', err);
          });
          return connection;
        },
      }),
      inject: [ConfigService],
    }),

    // ✅ Mailer Module
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('EMAIL_HOST'),
          port: configService.get<number>('EMAIL_PORT'),
          secure: configService.get<string>('EMAIL_SECURE') === 'true',
          auth: {
            user: configService.get<string>('EMAIL_USER'),
            pass: configService.get<string>('EMAIL_PASS'),
          },
        },
        defaults: {
          from: configService.get<string>('MAIL_FROM'),
        },
        template: {
          dir: join(__dirname, 'modules/mail/templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),

    // ✅ Feature Modules
    AuthModule,
    UsersModule,
    ProductsModule,
    OrdersModule,
    MailModule,
    UploadModule,
    CategoriesModule,
    CouponsModule,
    RawHerbSubCategoriesModule,
    ShiprocketModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
