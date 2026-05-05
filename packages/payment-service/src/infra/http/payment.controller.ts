import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ProcessPaymentUseCase } from '@application/use-cases/process-payment/process-payment.use-case';
import { CreatePaymentDto } from '@application/dto/create-payment.dto';
import type { PaymentResponse } from '@application/dto/create-payment.dto';

@Controller('payments')
export class PaymentController {
  constructor(private readonly processPaymentUseCase: ProcessPaymentUseCase) {}

  @Post()
  async create(@Body() input: CreatePaymentDto): Promise<PaymentResponse> {
    const result = await this.processPaymentUseCase.execute(input);
    return {
      paymentId: result.paymentId,
      orderId: input.orderId,
      status: result.status,
      amount: input.amount,
      method: input.method,
    };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return { message: 'Get payment not implemented yet', paymentId: id };
  }
}
