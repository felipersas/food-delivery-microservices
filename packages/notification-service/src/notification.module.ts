import { Module } from '@nestjs/common';
import { NotificationHandler } from './application/handlers/notification.handler';

@Module({
  providers: [NotificationHandler],
})
export class NotificationModule {}
