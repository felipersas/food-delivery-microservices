import { Controller, Get, Post, Put, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { CreateKitchenTicketUseCase } from '../../application/use-cases/create-kitchen-ticket';
import { GetKitchenTicketUseCase } from '../../application/use-cases/get-kitchen-ticket';
import { UpdateKitchenTicketStatusUseCase } from '../../application/use-cases/update-kitchen-ticket-status';
import { KitchenTicketStatus } from '../../domain/aggregates/kitchen-ticket.aggregate';
import type { CreateKitchenTicketDto } from '../../application/dto/create-kitchen-ticket.dto';
import { CreateKitchenTicketOutput } from '../../application/dto/create-kitchen-ticket.dto';
import { GetKitchenTicketOutput as GetKitchenTicketDto } from '../../application/dto/get-kitchen-ticket.dto';
import { UpdateKitchenTicketOutput } from '../../application/dto/update-kitchen-ticket.dto';

@ApiTags('kitchen')
@Controller('kitchen')
export class KitchenController {
  constructor(
    private readonly createKitchenTicketUseCase: CreateKitchenTicketUseCase,
    private readonly getKitchenTicketUseCase: GetKitchenTicketUseCase,
    private readonly updateKitchenTicketStatusUseCase: UpdateKitchenTicketStatusUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create kitchen ticket', description: 'Creates a new kitchen ticket for order preparation' })
  @ApiResponse({ status: 201, description: 'Kitchen ticket created', type: CreateKitchenTicketOutput })
  @ApiBadRequestResponse({ description: 'Invalid ticket data' })
  async create(@Body() input: CreateKitchenTicketDto) {
    return this.createKitchenTicketUseCase.execute(input);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get kitchen ticket', description: 'Retrieves kitchen ticket details' })
  @ApiResponse({ status: 200, description: 'Kitchen ticket found', type: GetKitchenTicketDto })
  @ApiNotFoundResponse({ description: 'Kitchen ticket not found' })
  async get(@Param('id') id: string) {
    const ticket = await this.getKitchenTicketUseCase.execute(id);
    if (!ticket) {
      return { error: 'Kitchen ticket not found' };
    }
    return ticket;
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update ticket status', description: 'Updates the status of a kitchen ticket' })
  @ApiResponse({ status: 200, description: 'Ticket status updated', type: UpdateKitchenTicketOutput })
  @ApiNotFoundResponse({ description: 'Kitchen ticket not found' })
  async updateStatus(@Param('id') id: string, @Body('status') status: KitchenTicketStatus) {
    const result = await this.updateKitchenTicketStatusUseCase.execute(id, status);
    if (!result) {
      return { error: 'Kitchen ticket not found' };
    }
    return result;
  }
}
