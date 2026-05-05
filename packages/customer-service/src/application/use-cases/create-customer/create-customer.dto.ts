import { IsString, IsNotEmpty, MinLength, IsEmail, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Customer full name', example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name!: string;

  @ApiProperty({ description: 'Customer email address', example: 'joao.silva@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Phone number with country code', example: '+55119999887766' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?\d{10,15}$/)
  phone!: string;
}

export type CreateCustomerInput = CreateCustomerDto;

export class CreateCustomerOutput {
  @ApiProperty({ description: 'Customer ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  customerId!: string;

  @ApiProperty({
    description: 'Customer status',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
  })
  status!: string;
}
