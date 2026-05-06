import { IsOptional, IsString, IsNumber, Min, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum RestaurantStatusEnum {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
  CLOSED = 'closed',
}

export class ListRestaurantsDto {
  @ApiPropertyOptional({ example: 'pending', enum: RestaurantStatusEnum })
  @IsOptional()
  @IsEnum(RestaurantStatusEnum)
  status?: RestaurantStatusEnum;

  @ApiPropertyOptional({ example: 'pizza', description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: -23.561684, description: 'Latitude for nearby search' })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: -46.655981, description: 'Longitude for nearby search' })
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ example: 5, description: 'Radius in km (requires lat/lng)', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  radiusKm?: number;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Filter by owner ID' })
  @IsOptional()
  @IsString()
  ownerId?: string;
}

export type ListRestaurantsInput = ListRestaurantsDto;
