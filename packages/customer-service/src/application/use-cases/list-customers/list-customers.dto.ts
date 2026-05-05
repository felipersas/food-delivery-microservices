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

  @ApiProperty({ description: 'Filter by status', example: 'ACTIVE', required: false, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] })
  @IsOptional()
  @IsString()
  @IsEnum(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
  status?: string;

  @ApiProperty({ description: 'Search in name or email', example: 'john', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Sort field', example: 'createdAt', required: false, enum: CustomerSortBy })
  @IsOptional()
  @IsString()
  @IsEnum(CustomerSortBy)
  sortBy?: CustomerSortBy = CustomerSortBy.CREATED_AT;

  @ApiProperty({ description: 'Sort order', example: 'DESC', required: false, enum: SortOrder })
  @IsOptional()
  @IsString()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}

export type ListCustomersInput = ListCustomersDto;

export interface CustomerListItem {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: Date;
}

export interface ListCustomersOutput {
  customers: CustomerListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
