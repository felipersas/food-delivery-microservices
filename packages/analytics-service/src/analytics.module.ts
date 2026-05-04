import { Module } from '@nestjs/common';
import { AnalyticsHandler } from './application/handlers/analytics.handler';

@Module({
  providers: [AnalyticsHandler],
})
export class AnalyticsModule {}
