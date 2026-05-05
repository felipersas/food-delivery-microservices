import {
  IsString,
  IsOptional,
  IsNotEmpty,
  MinLength,
  IsEmail,
  Matches,
  IsNumber,
  Min,
  IsEnum,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Create Customer DTO
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

// Update Customer Profile DTO
export class UpdateCustomerProfileDto {
  @ApiPropertyOptional({ description: 'Customer full name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional({ description: 'Customer email address', example: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number with country code', example: '+5511999999999' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?\d{10,15}$/)
  phone?: string;
}

// Add Customer Address DTO
export class AddCustomerAddressDto {
  @ApiProperty({ description: 'Street name', example: 'Av Paulista' })
  @IsString()
  @IsNotEmpty()
  street!: string;

  @ApiProperty({ description: 'House/Building number', example: '1000' })
  @IsString()
  @IsNotEmpty()
  number!: string;

  @ApiPropertyOptional({ description: 'Apartment/suite information', example: 'Apt 101' })
  @IsOptional()
  @IsString()
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

// Save Payment Method DTO
export class SavePaymentMethodDto {
  @ApiProperty({ description: 'Last 4 digits of card number (NEVER store full number)', example: '4242' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}$/)
  token!: string;

  @ApiProperty({ description: 'Card brand', example: 'visa', enum: ['visa', 'mastercard', 'amex', 'elo', 'hipercard', 'discover'] })
  @IsString()
  @IsEnum(['visa', 'mastercard', 'amex', 'elo', 'hipercard', 'discover'])
  brand!: string;

  @ApiProperty({ description: 'Expiry month (1-12)', example: 12, minimum: 1, maximum: 12 })
  @IsNumber()
  @Min(1)
  expiryMonth!: number;

  @ApiProperty({ description: 'Expiry year', example: 2026, minimum: 2024, maximum: 2045 })
  @IsNumber()
  @Min(2024)
  expiryYear!: number;
}

// List Customers DTO
export class ListCustomersDto {
  @ApiPropertyOptional({ description: 'Page number (0-indexed)', example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by customer status',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
  })
  @IsOptional()
  @IsString()
  @IsEnum(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Search in name or email', example: 'joão' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    enum: ['name', 'email', 'createdAt', 'totalOrders', 'totalSpent'],
  })
  @IsOptional()
  @IsString()
  @IsEnum(['name', 'email', 'createdAt', 'totalOrders', 'totalSpent'] as const)
  sortBy?: 'name' | 'email' | 'createdAt' | 'totalOrders' | 'totalSpent';

  @ApiPropertyOptional({ description: 'Sort order', example: 'DESC', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  @IsEnum(['ASC', 'DESC'] as const)
  sortOrder?: 'ASC' | 'DESC';
}

// Get Customer by ID DTO
export class GetCustomerByIdDto {
  @ApiProperty({ description: 'Customer ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id!: string;
}

// Remove Address DTO
export class RemoveCustomerAddressDto {
  @ApiProperty({ description: 'Customer ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id!: string;

  @ApiProperty({ description: 'Address index in the addresses array', example: 0, minimum: 0 })
  @IsNumber()
  @Min(0)
  addressIndex!: number;
}

// Remove Payment Method DTO
export class RemovePaymentMethodDto {
  @ApiProperty({ description: 'Customer ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id!: string;

  @ApiProperty({ description: 'Payment method index in the array', example: 0, minimum: 0 })
  @IsNumber()
  @Min(0)
  paymentMethodIndex!: number;
}
