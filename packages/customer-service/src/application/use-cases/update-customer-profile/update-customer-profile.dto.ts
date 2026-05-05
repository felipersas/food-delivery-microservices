import { IsString, IsOptional, IsNotEmpty, MinLength, IsEmail, Matches } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { CreateCustomerDto } from '@application/use-cases/create-customer/create-customer.dto';

export class UpdateCustomerProfileDto extends PartialType(CreateCustomerDto) {
  @ApiProperty({ description: 'Customer full name', example: 'John Doe', required: false })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MinLength(3)
  name?: string;

  @ApiProperty({ description: 'Customer email address', example: 'john.doe@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Phone number with country code', example: '+5511999999999', required: false })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @Matches(/^\+?\d{10,15}$/)
  phone?: string;
}

export type UpdateCustomerProfileInput = { id: string } & UpdateCustomerProfileDto;

export interface UpdateCustomerProfileOutput {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  status: string;
}
