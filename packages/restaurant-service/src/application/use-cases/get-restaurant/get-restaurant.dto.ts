import { ApiProperty } from '@nestjs/swagger';

export interface GetRestaurantOutput {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    latitude?: number;
    longitude?: number;
  };
  phone: string;
  email: string;
  operatingHours: Array<{
    dayOfWeek: number;
    dayName: string;
    openTime: string;
    closeTime: string;
  }>;
  status: string;
  averageRating: number;
  totalRatings: number;
  deliveryFeeCents: number;
  minOrderCents: number;
  estimatedPrepTimeMinutes: number;
  isOpenNow: boolean;
  createdAt: Date;
  updatedAt: Date;
}
