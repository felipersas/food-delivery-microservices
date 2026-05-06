import { ApiProperty } from '@nestjs/swagger';

export interface DeleteMenuItemDto {
  // No input needed, ID is from route parameter
}

export type DeleteMenuItemInput = DeleteMenuItemDto;

export interface DeleteMenuItemOutput {
  menuItemId: string;
  deleted: boolean;
}
