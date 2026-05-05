import { IsString, IsNumber, IsIn, Min, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}

export class GetPaymentByIdDto {
  @ApiProperty({ description: 'Payment ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id!: string;
}
