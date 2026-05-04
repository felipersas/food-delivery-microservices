import { Module } from '@nestjs/common';
import { ProcessPaymentUseCase } from './application/use-cases/process-payment/process-payment.use-case';

@Module({
  providers: [ProcessPaymentUseCase],
})
export class PaymentModule {}
