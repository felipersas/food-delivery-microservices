import { IsString, IsNumber, Min, Max, IsIn, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const PAYMENT_BRANDS = ['visa', 'mastercard', 'amex', 'elo', 'hipercard', 'discover'] as const;

export class SavePaymentMethodDto {
  @ApiProperty({ description: 'Last 4 digits of card number (NEVER store full number)', example: '1234' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}$/)
  token!: string;

  @ApiProperty({ description: 'Card brand', example: 'visa', enum: PAYMENT_BRANDS })
  @IsString()
  @IsIn(PAYMENT_BRANDS)
  brand!: (typeof PAYMENT_BRANDS)[number];

  @ApiProperty({ description: 'Expiry month (1-12)', example: 12, minimum: 1, maximum: 12 })
  @IsNumber()
  @Min(1)
  @Max(12)
  expiryMonth!: number;

  @ApiProperty({ description: 'Expiry year', example: 2026, minimum: 2024, maximum: 2045 })
  @IsNumber()
  @Min(2024)
  @Max(2045)
  expiryYear!: number;
}

export type SavePaymentMethodInput = { customerId: string } & SavePaymentMethodDto;

export class SavePaymentMethodOutput {
  @ApiProperty({ description: 'Customer ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  customerId!: string;

  @ApiProperty({ description: 'Total number of payment methods after saving', example: 2 })
  paymentMethodCount!: number;

  @ApiProperty({ description: 'Card brand', example: 'visa' })
  brand!: string;

  @ApiProperty({ description: 'Last 4 digits', example: '4242' })
  last4!: string;
}
