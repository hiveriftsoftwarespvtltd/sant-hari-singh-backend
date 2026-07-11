import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadController, UploadLegacyController } from './upload.controller';

@Module({
  imports: [ConfigModule],
  controllers: [UploadController, UploadLegacyController],
})
export class UploadModule {}
