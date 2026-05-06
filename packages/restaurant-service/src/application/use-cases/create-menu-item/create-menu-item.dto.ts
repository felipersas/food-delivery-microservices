import { IsString, IsNumber, IsOptional, IsEnum, IsUrl, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MenuItemCategoryEnum } from '@domain/value-objects/menu-item-category.vo';

export class CreateMenuItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  restaurantId!: string;

  @ApiProperty({ example: 'Margherita Pizza' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Classic tomato and mozzarella pizza' })
  @IsString()
  description!: string;

  @ApiProperty({ example: 29.90, description: 'Price in BRL' })
  @IsNumber()
  @Min(0.01)
  priceAmount!: number;

  @ApiProperty({
    enum: MenuItemCategoryEnum,
    example: MenuItemCategoryEnum.MAIN,
    description: 'Menu item category',
  })
  @IsEnum(MenuItemCategoryEnum)
  category!: MenuItemCategoryEnum;

  @ApiPropertyOptional({
    example: 'https://example.com/pizza.jpg',
    description: 'URL to item image',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({
    example: 20,
    description: 'Preparation time in minutes',
    minimum: 1,
    maximum: 240,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(240)
  preparationTimeMinutes?: number;
}

export type CreateMenuItemInput = CreateMenuItemDto;

export interface CreateMenuItemOutput {
  menuItemId: string;
  name: string;
  category: MenuItemCategoryEnum;
  priceAmount: number;
}
