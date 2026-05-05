import { IsString, IsNotEmpty, IsOptional, MinLength, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCustomerAddressDto {
  @ApiProperty({ description: 'Street name', example: 'Av Paulista' })
  @IsString()
  @IsNotEmpty()
  street!: string;

  @ApiProperty({ description: 'House/Building number', example: '1000' })
  @IsString()
  @IsNotEmpty()
  number!: string;

  @ApiProperty({ description: 'Apartment/suite information', example: 'Apt 101', required: false })
  @IsString()
  @IsOptional()
  complement?: string;

  @ApiProperty({ description: 'City name', example: 'São Paulo' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ description: 'State abbreviation (2 characters)', example: 'SP' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(2)
  state!: string;

  @ApiProperty({ description: 'Brazilian zip code (XXXXX-XXX)', example: '01310-100' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{5}-\d{3}$/)
  zipCode!: string;
}

export type AddCustomerAddressInput = { customerId: string } & AddCustomerAddressDto;

export interface AddCustomerAddressOutput {
  customerId: string;
  addressCount: number;
}
