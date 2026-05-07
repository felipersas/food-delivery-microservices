import { IsString, IsOptional, IsEnum, IsNumber, IsObject, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRestaurantDto {
  @ApiProperty({ description: 'Restaurant name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Restaurant description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Owner user ID' })
  @IsString()
  ownerId: string;

  @ApiProperty({ description: 'Operating hours' })
  @IsObject()
  operatingHours: Record<string, { open: string; close: string }>;

  @ApiPropertyOptional({ description: 'Delivery fee in cents' })
  @IsOptional()
  @IsNumber()
  deliveryFeeCents?: number;

  @ApiPropertyOptional({ description: 'Minimum order amount in cents' })
  @IsOptional()
  @IsNumber()
  minOrderAmountCents?: number;
}

export class ListRestaurantsDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: ['pending', 'active', 'suspended', 'inactive', 'closed'] })
  @IsOptional()
  @IsEnum(['pending', 'active', 'suspended', 'inactive', 'closed'])
  status?: string;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Latitude for geolocation search' })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude for geolocation search' })
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ description: 'Search radius in km' })
  @IsOptional()
  @IsNumber()
  radiusKm?: number;

  @ApiPropertyOptional({ description: 'Filter by owner ID' })
  @IsOptional()
  @IsString()
  ownerId?: string;
}

export class GetRestaurantByIdDto {
  @ApiProperty({ description: 'Restaurant ID' })
  @IsString()
  id: string;
}

export class CreateMenuItemDto {
  @ApiProperty({ description: 'Menu item name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Menu item description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Price in cents' })
  @IsNumber()
  priceCents: number;

  @ApiProperty({ description: 'Menu item category', enum: ['appetizer', 'main', 'dessert', 'drink', 'side'] })
  @IsEnum(['appetizer', 'main', 'dessert', 'drink', 'side'])
  category: string;

  @ApiPropertyOptional({ description: 'Whether the item is currently available' })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({ description: 'Allergen information' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @ApiPropertyOptional({ description: 'Spiciness level 1-5' })
  @IsOptional()
  @IsNumber()
  spicinessLevel?: number;
}

export class ListMenuItemsDto {
  @ApiPropertyOptional({ description: 'Filter by category', enum: ['appetizer', 'main', 'dessert', 'drink', 'side'] })
  @IsOptional()
  @IsEnum(['appetizer', 'main', 'dessert', 'drink', 'side'])
  category?: string;

  @ApiPropertyOptional({ description: 'Show only available items' })
  @IsOptional()
  @IsBoolean()
  available?: boolean;
}

export class CreateMenuItemForRestaurantDto {
  @ApiProperty({ description: 'Restaurant ID' })
  @IsString()
  restaurantId: string;

  @ApiProperty({ description: 'Menu item data' })
  menu_item: CreateMenuItemDto;
}

export class ListMenuItemsForRestaurantDto {
  @ApiProperty({ description: 'Restaurant ID' })
  @IsString()
  restaurantId: string;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsEnum(['appetizer', 'main', 'dessert', 'drink', 'side'])
  category?: string;

  @ApiPropertyOptional({ description: 'Show only available items' })
  @IsOptional()
  @IsBoolean()
  available?: boolean;
}

export class UpdateMenuItemDto {
  @ApiPropertyOptional({ description: 'Menu item name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Menu item description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Price in cents' })
  @IsOptional()
  @IsNumber()
  priceCents?: number;

  @ApiPropertyOptional({ description: 'Menu item category' })
  @IsOptional()
  @IsEnum(['appetizer', 'main', 'dessert', 'drink', 'side'])
  category?: string;

  @ApiPropertyOptional({ description: 'Whether the item is currently available' })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({ description: 'Allergen information' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @ApiPropertyOptional({ description: 'Spiciness level 1-5' })
  @IsOptional()
  @IsNumber()
  spicinessLevel?: number;
}

export class GetMenuItemByIdDto {
  @ApiProperty({ description: 'Menu item ID' })
  @IsString()
  id: string;
}
