import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { ProcessPaymentUseCase } from '@application/use-cases/process-payment/process-payment.use-case';
import { RefundPaymentUseCase } from '@application/use-cases/refund-payment/refund-payment.use-case';
import {
  CreatePaymentDto,
  PaymentResponse,
} from '@application/dto/create-payment.dto';
import { RefundPaymentDto } from '@application/use-cases/refund-payment/refund-payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
    private readonly refundPaymentUseCase: RefundPaymentUseCase,
  ) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get payment by ID',
    description: 'Retrieves payment details (not yet implemented)',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Payment details' })
  async get(@Param('id') id: string) {
    return { message: 'Get payment not implemented yet', paymentId: id };
  }

  @Post('refund/:id')
  @ApiOperation({
    summary: 'Refund payment',
    description: 'Process a refund for a confirmed payment',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: RefundPaymentDto,
    description: 'Refund data with amount and reason',
  })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  @ApiBadRequestResponse({
    description: 'Invalid refund data or payment not in refundable state',
  })
  async refund(@Param('id') id: string, @Body() input: RefundPaymentDto) {
    const result = await this.refundPaymentUseCase.execute({
      paymentId: id,
      amount: input.amount,
      reason: input.reason,
      refundId: input.refundId,
    });
    return result;
  }
}
