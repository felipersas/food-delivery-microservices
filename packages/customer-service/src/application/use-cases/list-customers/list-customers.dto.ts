import { IsOptional, IsString, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum CustomerSortBy {
  NAME = 'name',
  EMAIL = 'email',
  CREATED_AT = 'createdAt',
  TOTAL_ORDERS = 'totalOrders',
  TOTAL_SPENT = 'totalSpent',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class ListCustomersDto {
  @ApiProperty({ description: 'Page number (0-indexed)', example: 0, required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  page?: number = 0;

  @ApiProperty({ description: 'Items per page', example: 20, required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;

  @ApiProperty({
    description: 'Filter by customer status',
    example: 'ACTIVE',
    required: false,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
  })
  @IsOptional()
  @IsString()
  @IsEnum(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
  status?: string;

  @ApiProperty({ description: 'Search in name or email', example: 'joão', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Sort field',
    example: 'createdAt',
    required: false,
    enum: CustomerSortBy,
  })
  @IsOptional()
  @IsString()
  @IsEnum(CustomerSortBy)
  sortBy?: CustomerSortBy = CustomerSortBy.CREATED_AT;

  @ApiProperty({
    description: 'Sort order',
    example: 'DESC',
    required: false,
    enum: SortOrder,
  })
  @IsOptional()
  @IsString()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}

export type ListCustomersInput = ListCustomersDto;

export class CustomerListItem {
  @ApiProperty({ description: 'Customer ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  customerId!: string;

  @ApiProperty({ description: 'Customer full name', example: 'João Silva' })
  name!: string;

  @ApiProperty({ description: 'Customer email address', example: 'joao.silva@example.com' })
  email!: string;

  @ApiProperty({ description: 'Phone number with country code', example: '+55119999887766' })
  phone!: string;

  @ApiProperty({
    description: 'Customer account status',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
  })
  status!: string;

  @ApiProperty({ description: 'Total number of orders placed', example: 15 })
  totalOrders!: number;

  @ApiProperty({ description: 'Total amount spent across all orders (BRL)', example: 1250.50 })
  totalSpent!: number;

  @ApiProperty({ description: 'Account creation date', example: '2026-01-15T10:30:00.000Z' })
  createdAt!: Date;
}

export class ListCustomersOutput {
  @ApiProperty({ description: 'List of customers', type: [CustomerListItem] })
  customers!: CustomerListItem[];

  @ApiProperty({ description: 'Total number of customers', example: 100 })
  total!: number;

  @ApiProperty({ description: 'Current page number', example: 0 })
  page!: number;

  @ApiProperty({ description: 'Number of items per page', example: 20 })
  limit!: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  totalPages!: number;
}
