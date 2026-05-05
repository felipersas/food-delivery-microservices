import { Controller, Get, Post, Put, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { CreateKitchenTicketUseCase } from '../../application/use-cases/create-kitchen-ticket';
import { GetKitchenTicketUseCase } from '../../application/use-cases/get-kitchen-ticket';
import { UpdateKitchenTicketStatusUseCase } from '../../application/use-cases/update-kitchen-ticket-status';
import { KitchenTicketStatus } from '../../domain/aggregates/kitchen-ticket.aggregate';
import type { CreateKitchenTicketDto } from '../../application/dto/create-kitchen-ticket.dto';

@Controller('kitchen')
export class KitchenController {
  constructor(
    private readonly createKitchenTicketUseCase: CreateKitchenTicketUseCase,
    private readonly getKitchenTicketUseCase: GetKitchenTicketUseCase,
    private readonly updateKitchenTicketStatusUseCase: UpdateKitchenTicketStatusUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() input: CreateKitchenTicketDto) {
    return this.createKitchenTicketUseCase.execute(input);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const ticket = await this.getKitchenTicketUseCase.execute(id);
    if (!ticket) {
      return { error: 'Kitchen ticket not found' };
    }
    return ticket;
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: KitchenTicketStatus) {
    const result = await this.updateKitchenTicketStatusUseCase.execute(id, status);
    if (!result) {
      return { error: 'Kitchen ticket not found' };
    }
    return result;
  }
}
