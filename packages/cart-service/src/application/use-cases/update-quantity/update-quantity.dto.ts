import { IsUUID, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateQuantityDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ example: 'menu-item-id' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export type UpdateQuantityInput = UpdateQuantityDto;

export interface UpdateQuantityOutput {
  cartId: string;
  productId: string;
  quantity: number;
}
