import { IsString, IsNumber, IsIn, Min, IsUUID, IsNotEmpty } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  @IsNotEmpty()
  orderId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsIn(['CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'CASH'])
  @IsNotEmpty()
  method!: string;
}

export class GetPaymentByIdDto {
  @IsUUID()
  id!: string;
}
