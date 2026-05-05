import { IsEnum, IsUUID } from 'class-validator';
import { KitchenTicketStatus } from '../../domain/aggregates/kitchen-ticket.aggregate';

export class UpdateKitchenTicketDto {
  @IsEnum(KitchenTicketStatus)
  status!: KitchenTicketStatus;
}

export interface UpdateKitchenTicketOutput {
  ticketId: string;
  orderId: string;
  status: string;
}
