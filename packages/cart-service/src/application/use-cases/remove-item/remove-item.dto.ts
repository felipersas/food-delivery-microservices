import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RemoveItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ example: 'menu-item-id' })
  @IsUUID()
  productId!: string;
}

export type RemoveItemInput = RemoveItemDto;

export interface RemoveItemOutput {
  cartId: string;
  productId: string;
}
