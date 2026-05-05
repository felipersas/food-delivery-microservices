import { IsString, IsNumber, IsIn, IsNotEmpty, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsIn(['CREDIT_CARD', 'DEBIT_CARD', 'PIX'])
  method!: string;
}

export interface PaymentResponse {
  paymentId: string;
  orderId: string;
  status: string;
  amount: number;
  method: string;
}
