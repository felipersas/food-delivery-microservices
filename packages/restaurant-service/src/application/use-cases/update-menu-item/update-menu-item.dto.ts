import { IsString, IsNumber, IsOptional, IsEnum, IsUrl, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MenuItemCategoryEnum } from '@domain/value-objects/menu-item-category.vo';

export class UpdateMenuItemDto {
  @ApiPropertyOptional({ example: 'Margherita Pizza Supreme' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Premium tomato and mozzarella pizza with basil' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 35.90, description: 'New price in BRL' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  priceAmount?: number;

  @ApiPropertyOptional({
    enum: MenuItemCategoryEnum,
    example: MenuItemCategoryEnum.MAIN,
  })
  @IsOptional()
  @IsEnum(MenuItemCategoryEnum)
  category?: MenuItemCategoryEnum;

  @ApiPropertyOptional({
    example: 'https://example.com/pizza-new.jpg',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ example: false, description: 'Mark item as unavailable' })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({ example: 25, description: 'New preparation time in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(240)
  preparationTimeMinutes?: number;
}

export type UpdateMenuItemInput = UpdateMenuItemDto;

export interface UpdateMenuItemOutput {
  menuItemId: string;
  name: string;
  priceAmount: number;
  category: MenuItemCategoryEnum;
  available: boolean;
  updatedAt: Date;
}
