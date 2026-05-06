import { ApiProperty } from '@nestjs/swagger';
import { MenuItemCategoryEnum } from '@domain/value-objects/menu-item-category.vo';

export interface GetMenuItemOutput {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  priceAmount: number;
  priceCents: number;
  category: MenuItemCategoryEnum;
  imageUrl: string | null;
  available: boolean;
  preparationTimeMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}
