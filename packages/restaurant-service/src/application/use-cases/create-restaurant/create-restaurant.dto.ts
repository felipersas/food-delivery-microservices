import { IsString, IsNumber, IsOptional, IsEnum, IsArray, Min, Max, ValidateNested, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRestaurantAddressDto {
  @ApiProperty({ example: 'Av. Paulista' })
  @IsString()
  street!: string;

  @ApiProperty({ example: '1000' })
  @IsString()
  number!: string;

  @ApiPropertyOptional({ example: 'Apto 101' })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiProperty({ example: 'Bela Vista' })
  @IsString()
  neighborhood!: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  city!: string;

  @ApiProperty({ example: 'SP', minLength: 2, maxLength: 2 })
  @IsString()
  state!: string;

  @ApiProperty({ example: '01310-100' })
  @IsString()
  zipCode!: string;

  @ApiPropertyOptional({ example: -23.561684, minimum: -90, maximum: 90 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: -46.655981, minimum: -180, maximum: 180 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class CreateOperatingHoursDto {
  @ApiProperty({ example: 0, description: '0 = Sunday, 6 = Saturday', minimum: 0, maximum: 6 })
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: '11:00', description: 'HH:MM format' })
  @IsString()
  openTime!: string;

  @ApiProperty({ example: '23:00', description: 'HH:MM format' })
  @IsString()
  closeTime!: string;
}

export class CreateRestaurantDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  ownerId!: string;

  @ApiProperty({ example: 'Pizza Place' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Best pizza in town' })
  @IsString()
  description!: string;

  @ApiProperty({ type: CreateRestaurantAddressDto })
  @ValidateNested()
  @Type(() => CreateRestaurantAddressDto)
  address!: CreateRestaurantAddressDto;

  @ApiProperty({ example: '+5511999999999' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: 'contact@pizzaplace.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ type: [CreateOperatingHoursDto], minItems: 1 })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOperatingHoursDto)
  operatingHours!: CreateOperatingHoursDto[];

  @ApiPropertyOptional({ example: 500, description: 'Delivery fee in cents', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFeeCents?: number;

  @ApiPropertyOptional({ example: 2000, description: 'Minimum order in cents', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderCents?: number;

  @ApiPropertyOptional({ example: 30, description: 'Estimated prep time in minutes', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedPrepTimeMinutes?: number;
}

export type CreateRestaurantInput = CreateRestaurantDto;

export interface CreateRestaurantOutput {
  restaurantId: string;
  name: string;
  status: string;
}
