import { IsUUID, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RemovePaymentMethodDto {
  @ApiProperty({ description: 'Customer ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ description: 'Payment method index in array', example: 0, minimum: 0 })
  @IsNumber()
  @Min(0)
  paymentMethodIndex!: number;
}

export type RemovePaymentMethodInput = RemovePaymentMethodDto;

export class RemovePaymentMethodOutput {
  @ApiProperty({ description: 'Customer ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  customerId!: string;

  @ApiProperty({ description: 'Remaining number of payment methods', example: 1 })
  remainingPaymentMethods!: number;
}
