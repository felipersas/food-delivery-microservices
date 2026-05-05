import { IsString, IsNotEmpty, MinLength, IsEmail, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Customer full name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name!: string;

  @ApiProperty({ description: 'Customer email address', example: 'john.doe@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Phone number with country code', example: '+5511999999999' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?\d{10,15}$/)
  phone!: string;
}

export type CreateCustomerInput = CreateCustomerDto;

export interface CreateCustomerOutput {
  customerId: string;
  status: string;
}
