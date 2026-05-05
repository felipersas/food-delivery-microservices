import { IsNumber, IsUUID, IsString, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefundPaymentDto {
  @ApiProperty({ description: 'Payment ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  paymentId!: string;

  @ApiProperty({ description: 'Refund amount in BRL', example: 50.00, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Reason for refund', example: 'Customer request' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export interface RefundPaymentInput {
  paymentId: string;
  amount: number;
  reason: string;
}

export interface RefundPaymentOutput {
  paymentId: string;
  status: string;
  refundedAmount: number;
  refundId: string;
}
