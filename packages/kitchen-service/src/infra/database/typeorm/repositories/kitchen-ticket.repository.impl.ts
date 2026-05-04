import { DataSource } from 'typeorm';
import { KitchenTicket } from '@domain/aggregates/kitchen-ticket.aggregate';
import { KitchenTicketStatus } from '@domain/aggregates/kitchen-ticket.aggregate';
import { KitchenTicketEntity } from '@infra/database/typeorm/entities/kitchen-ticket.entity';
import { KitchenTicketItemEntity } from '@infra/database/typeorm/entities/kitchen-ticket-item.entity';
import type { KitchenTicketRepository } from '@domain/repositories/kitchen-ticket.repository.interface';
import { v4 as uuidv4 } from 'uuid';

export class PostgresKitchenTicketRepository
  implements KitchenTicketRepository
{
  constructor(private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<KitchenTicket | null> {
    const repo = this.dataSource.getRepository(KitchenTicketEntity);
    const entity = await repo.findOne({ where: { id } });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async save(ticket: KitchenTicket): Promise<void> {
    const repo = this.dataSource.getRepository(KitchenTicketEntity);
    const itemRepo = this.dataSource.getRepository(KitchenTicketItemEntity);
    const entity = this.toEntity(ticket);
    const existing = await repo.findOne({ where: { id: ticket.getId() } });

    if (existing) {
      await itemRepo.delete({ ticketId: ticket.getId() });
      await repo.save(entity);
    } else {
      await repo.save(entity);
    }
  }

  async delete(id: string): Promise<void> {
    const repo = this.dataSource.getRepository(KitchenTicketEntity);
    const itemRepo = this.dataSource.getRepository(KitchenTicketItemEntity);
    await itemRepo.delete({ ticketId: id });
    await repo.delete(id);
  }

  private toDomain(entity: KitchenTicketEntity): KitchenTicket {
    return KitchenTicket.reconstitute({
      id: entity.id,
      orderId: entity.orderId,
      items: entity.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
      })),
      status: entity.status as KitchenTicketStatus,
      version: entity.version,
    });
  }

  private toEntity(ticket: KitchenTicket): KitchenTicketEntity {
    const entity = new KitchenTicketEntity();
    entity.id = ticket.getId();
    entity.orderId = ticket.getOrderId();
    entity.status = ticket.getStatus();
    entity.version = ticket.getVersion();
    entity.items = ticket.getItems().map((item) => {
      const itemEntity = new KitchenTicketItemEntity();
      itemEntity.id = uuidv4();
      itemEntity.ticketId = ticket.getId();
      itemEntity.productId = item.productId;
      itemEntity.productName = item.productName;
      itemEntity.quantity = item.quantity;
      return itemEntity;
    });
    return entity;
  }
}
