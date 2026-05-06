import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MenuItemCategoryEnum } from '@domain/value-objects/menu-item-category.vo';

export class ListMenuItemsDto {
  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Filter by restaurant ID' })
  @IsOptional()
  @IsString()
  restaurantId?: string;

  @ApiPropertyOptional({
    enum: MenuItemCategoryEnum,
    example: MenuItemCategoryEnum.MAIN,
    description: 'Filter by category',
  })
  @IsOptional()
  @IsEnum(MenuItemCategoryEnum)
  category?: MenuItemCategoryEnum;

  @ApiPropertyOptional({ example: true, description: 'Show only available items' })
  @IsOptional()
  @IsBoolean()
  available?: boolean;
}

export type ListMenuItemsInput = ListMenuItemsDto;

export interface ListMenuItemsOutput {
  items: Array<{
    id: string;
    restaurantId: string;
    name: string;
    description: string;
    priceAmount: number;
    category: MenuItemCategoryEnum;
    imageUrl: string | null;
    available: boolean;
    preparationTimeMinutes: number;
  }>;
  total: number;
}
