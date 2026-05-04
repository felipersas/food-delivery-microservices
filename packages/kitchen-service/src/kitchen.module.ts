import { Module } from '@nestjs/common';
import { KitchenProcessor } from './application/processors/kitchen.processor';

@Module({
  providers: [KitchenProcessor],
})
export class KitchenModule {}
