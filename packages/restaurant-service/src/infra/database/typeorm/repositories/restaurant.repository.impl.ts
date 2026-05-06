import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Not, IsNull, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Restaurant } from '@domain/aggregates/restaurant.aggregate';
import type { RestaurantRepository } from '@domain/repositories/restaurant.repository.interface';
import { RestaurantEntity } from '@infra/database/typeorm/entities/restaurant.entity';
import { OperatingHoursEntity } from '@infra/database/typeorm/entities/operating-hours.entity';
import { RestaurantAddress } from '@domain/value-objects/restaurant-address.vo';
import { RestaurantStatus } from '@domain/value-objects/restaurant-status.vo';
import { OperatingHours } from '@domain/value-objects/operating-hours.vo';

@Injectable()
export class PostgresRestaurantRepository implements RestaurantRepository {
  private restaurantRepo: Repository<RestaurantEntity>;
  private operatingHoursRepo: Repository<OperatingHoursEntity>;

  constructor(@InjectDataSource() private dataSource: DataSource) {
    this.restaurantRepo = this.dataSource.getRepository(RestaurantEntity);
    this.operatingHoursRepo = this.dataSource.getRepository(OperatingHoursEntity);
  }

  async findById(id: string): Promise<Restaurant | null> {
    const entity = await this.restaurantRepo.findOne({ where: { id } });
    if (!entity) return null;

    const operatingHoursEntities = await this.operatingHoursRepo.find({
      where: { restaurantId: id },
      order: { dayOfWeek: 'ASC' },
    });

    return this.mapToAggregate(entity, operatingHoursEntities);
  }

  async save(aggregate: Restaurant): Promise<void> {
    const entity = this.mapToEntity(aggregate);
    
    // Check if restaurant exists
    const existing = await this.restaurantRepo.findOne({
      where: { id: aggregate.getId() },
    });

    if (existing) {
      await this.restaurantRepo.update(entity.id, entity);
      
      // Delete existing operating hours
      await this.operatingHoursRepo.delete({ restaurantId: aggregate.getId() });
    } else {
      await this.restaurantRepo.insert(entity);
    }

    // Insert operating hours
    const operatingHoursEntities = aggregate.getOperatingHours().map((oh, index) => {
      const ohEntity = new OperatingHoursEntity();
      ohEntity.id = uuidv4();
      ohEntity.restaurantId = aggregate.getId();
      ohEntity.dayOfWeek = oh.dayOfWeek;
      ohEntity.openTime = oh.openTime;
      ohEntity.closeTime = oh.closeTime;
      return ohEntity;
    });

    if (operatingHoursEntities.length > 0) {
      await this.operatingHoursRepo.insert(operatingHoursEntities);
    }
  }

  async delete(id: string): Promise<void> {
    await this.operatingHoursRepo.delete({ restaurantId: id });
    await this.restaurantRepo.delete({ id });
  }

  async findByOwnerId(ownerId: string): Promise<Restaurant[]> {
    const entities = await this.restaurantRepo.find({
      where: { ownerId },
      order: { name: 'ASC' },
    });

    const results: Restaurant[] = [];
    for (const entity of entities) {
      const restaurant = await this.findById(entity.id);
      if (restaurant) results.push(restaurant);
    }

    return results;
  }

  async findActive(): Promise<Restaurant[]> {
    const entities = await this.restaurantRepo.find({
      where: { status: 'active' },
      order: { name: 'ASC' },
    });

    const results: Restaurant[] = [];
    for (const entity of entities) {
      const restaurant = await this.findById(entity.id);
      if (restaurant) results.push(restaurant);
    }

    return results;
  }

  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number,
  ): Promise<Restaurant[]> {
    // Using PostGIS would be ideal, but for simplicity we'll filter in memory
    // In production, use: ST_DWithin(ST_MakePoint(longitude, latitude)::geography, ST_MakePoint(restaurant.longitude, restaurant.latitude)::geography, radiusKm * 1000)
    const entities = await this.restaurantRepo.find({
      where: [
        { status: 'active' },
        { latitude: Not(IsNull()) },
        { longitude: Not(IsNull()) },
      ],
    });

    const results: Restaurant[] = [];
    for (const entity of entities) {
      const restaurant = await this.findById(entity.id);
      if (restaurant && restaurant.getAddress().hasLocation()) {
        const address = restaurant.getAddress();
        const distance = this.calculateDistance(
          latitude,
          longitude,
          address.latitude!,
          address.longitude!,
        );
        if (distance <= radiusKm) {
          results.push(restaurant);
        }
      }
    }

    return results;
  }

  async findByName(search: string): Promise<Restaurant[]> {
    const entities = await this.restaurantRepo
      .createQueryBuilder('restaurant')
      .where('restaurant.name ILIKE :search', { search: `%${search}%` })
      .orderBy('restaurant.name', 'ASC')
      .getMany();

    const results: Restaurant[] = [];
    for (const entity of entities) {
      const restaurant = await this.findById(entity.id);
      if (restaurant) results.push(restaurant);
    }

    return results;
  }

  private mapToAggregate(
    entity: RestaurantEntity,
    operatingHoursEntities: OperatingHoursEntity[],
  ): Restaurant {
    const address = RestaurantAddress.create({
      street: entity.street,
      number: entity.number,
      complement: entity.complement ?? undefined,
      neighborhood: entity.neighborhood,
      city: entity.city,
      state: entity.state,
      zipCode: entity.zipCode,
      latitude: entity.latitude ?? undefined,
      longitude: entity.longitude ?? undefined,
    });

    const operatingHours = operatingHoursEntities.map((oh) =>
      OperatingHours.create({
        dayOfWeek: oh.dayOfWeek,
        openTime: oh.openTime,
        closeTime: oh.closeTime,
      }),
    );

    return Restaurant.reconstitute({
      id: entity.id,
      ownerId: entity.ownerId,
      name: entity.name,
      description: entity.description,
      address,
      phone: entity.phone,
      email: entity.email,
      operatingHours,
      status: entity.status as any,
      averageRating: Number(entity.averageRating),
      totalRatings: entity.totalRatings,
      deliveryFeeCents: entity.deliveryFeeCents,
      minOrderCents: entity.minOrderCents,
      estimatedPrepTimeMinutes: entity.estimatedPrepTimeMinutes,
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private mapToEntity(aggregate: Restaurant): RestaurantEntity {
    const entity = new RestaurantEntity();
    entity.id = aggregate.getId();
    entity.ownerId = aggregate.getOwnerId();
    entity.name = aggregate.getName();
    entity.description = aggregate.getDescription();
    entity.street = aggregate.getAddress().street;
    entity.number = aggregate.getAddress().number;
    entity.complement = aggregate.getAddress().complement ?? null;
    entity.neighborhood = aggregate.getAddress().neighborhood;
    entity.city = aggregate.getAddress().city;
    entity.state = aggregate.getAddress().state;
    entity.zipCode = aggregate.getAddress().zipCode;
    entity.latitude = aggregate.getAddress().latitude ?? null;
    entity.longitude = aggregate.getAddress().longitude ?? null;
    entity.phone = aggregate.getPhone();
    entity.email = aggregate.getEmail();
    entity.status = aggregate.getStatus();
    entity.averageRating = aggregate.getAverageRating();
    entity.totalRatings = aggregate.getTotalRatings();
    entity.deliveryFeeCents = aggregate.getDeliveryFeeCents();
    entity.minOrderCents = aggregate.getMinOrderCents();
    entity.estimatedPrepTimeMinutes = aggregate.getEstimatedPrepTimeMinutes();
    entity.version = aggregate.getVersion();
    entity.createdAt = aggregate.getCreatedAt();
    entity.updatedAt = aggregate.getUpdatedAt();
    return entity;
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (deg: number) => deg * (Math.PI / 180);
    const R = 6371; // Earth's radius in km

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
