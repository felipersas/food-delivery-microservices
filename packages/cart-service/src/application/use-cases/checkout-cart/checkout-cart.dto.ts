import { IsUUID, IsOptional, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentMethodType {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  PIX = 'PIX',
  CASH = 'CASH',
}

export class CheckoutCartDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3)
  paymentMethodIndex?: number;

  @ApiProperty({ enum: PaymentMethodType, required: false })
  @IsOptional()
  @IsEnum(PaymentMethodType)
  paymentMethodType?: PaymentMethodType;
}

export type CheckoutCartInput = CheckoutCartDto;

export interface CheckoutOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  priceCents: number;
}

export interface CheckoutCartOutput {
  cartId: string;
  orderId: string;
  restaurantId: string;
  items: CheckoutOrderItem[];
  totalAmountCents: number;
  paymentMethodIndex?: number;
  paymentMethodType?: string;
}
