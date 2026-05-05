import { IsUUID, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RemoveCustomerAddressDto {
  @ApiProperty({ description: 'Customer ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ description: 'Address index in customer addresses array', example: 0, minimum: 0 })
  @IsNumber()
  @Min(0)
  addressIndex!: number;
}

export type RemoveCustomerAddressInput = RemoveCustomerAddressDto;

export interface RemoveCustomerAddressOutput {
  customerId: string;
  remainingAddresses: number;
}
