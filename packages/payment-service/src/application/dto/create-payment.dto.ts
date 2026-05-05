import { IsString, IsNumber, IsIn, Min, IsUUID, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Order ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ description: 'Payment amount in BRL', example: 91.80, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({
    description: 'Payment method',
    example: 'CREDIT_CARD',
    enum: ['CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'CASH'],
  })
  @IsString()
  @IsIn(['CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'CASH'])
  @IsNotEmpty()
  method!: string;

  @ApiPropertyOptional({ description: 'Customer ID (for using saved payment methods)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Index of saved payment method from customer profile', example: 0, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paymentMethodIndex?: number;
}

export class GetPaymentByIdDto {
  @ApiProperty({ description: 'Payment ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id!: string;
}

export class PaymentResponse {
  @ApiProperty({ description: 'Payment ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  paymentId!: string;

  @ApiProperty({ description: 'Order ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  orderId!: string;

  @ApiProperty({ description: 'Payment status', example: 'CONFIRMED', enum: ['PENDING', 'CONFIRMED', 'REJECTED'] })
  status!: string;

  @ApiProperty({ description: 'Payment amount in BRL', example: 91.80 })
  amount!: number;

  @ApiProperty({ description: 'Payment method', example: 'CREDIT_CARD', enum: ['CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'CASH'] })
  method!: string;
}
