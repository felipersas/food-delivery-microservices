import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { ProcessPaymentUseCase } from '@application/use-cases/process-payment/process-payment.use-case';
import { CreatePaymentDto, PaymentResponse } from '@application/dto/create-payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly processPaymentUseCase: ProcessPaymentUseCase) {}

  @Post()
  @ApiOperation({ summary: 'Process payment', description: 'Processes a payment for an order' })
  @ApiResponse({ status: 201, description: 'Payment processed successfully', type: PaymentResponse })
  @ApiBadRequestResponse({ description: 'Invalid payment data' })
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
  @ApiOperation({ summary: 'Get payment by ID', description: 'Retrieves payment details (not yet implemented)' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  async get(@Param('id') id: string) {
    return { message: 'Get payment not implemented yet', paymentId: id };
  }
}
