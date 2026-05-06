import { Controller, Get, Post, Put, Body, Param, Query, HttpCode, HttpStatus, NotFoundException, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse, ApiNotFoundResponse, ApiBody, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Roles, UserRoleEnum } from '@app/shared';
import { CreateKitchenTicketUseCase } from '../../application/use-cases/create-kitchen-ticket';
import { GetKitchenTicketUseCase } from '../../application/use-cases/get-kitchen-ticket';
import { UpdateKitchenTicketStatusUseCase } from '../../application/use-cases/update-kitchen-ticket-status';
import { ListKitchenTicketsUseCase } from '../../application/use-cases/list-kitchen-tickets/list-kitchen-tickets.use-case';
import { KitchenTicketStatus } from '../../domain/aggregates/kitchen-ticket.aggregate';
import { CreateKitchenTicketDto, CreateKitchenTicketOutput } from '../../application/dto/create-kitchen-ticket.dto';
import { GetKitchenTicketOutput as GetKitchenTicketDto } from '../../application/dto/get-kitchen-ticket.dto';
import { UpdateKitchenTicketOutput } from '../../application/dto/update-kitchen-ticket.dto';
import { ListKitchenTicketsDto, KitchenTicketOutput } from '../../application/dto/list-kitchen-tickets.dto';

@ApiTags('kitchen')
@ApiBearerAuth('JWT')
@Controller('kitchen')
export class KitchenController {
  constructor(
    private readonly createKitchenTicketUseCase: CreateKitchenTicketUseCase,
    private readonly getKitchenTicketUseCase: GetKitchenTicketUseCase,
    private readonly updateKitchenTicketStatusUseCase: UpdateKitchenTicketStatusUseCase,
    @Inject('ListKitchenTicketsUseCase') private readonly listKitchenTicketsUseCase: ListKitchenTicketsUseCase,
  ) {}

  @Get('tickets')
  @Roles(UserRoleEnum.RESTAURANT, UserRoleEnum.ADMIN)
  @ApiOperation({ summary: 'List kitchen tickets', description: 'List all kitchen tickets, optionally filtered by restaurant and status' })
  @ApiResponse({ status: 200, description: 'List of kitchen tickets', type: [KitchenTicketOutput] })
  async listTickets(@Query() query: ListKitchenTicketsDto) {
    return this.listKitchenTicketsUseCase.execute(query);
  }

  @Get('tickets/queue')
  @Roles(UserRoleEnum.RESTAURANT, UserRoleEnum.ADMIN)
  @ApiOperation({ summary: 'List kitchen queue', description: 'List kitchen tickets by queue status' })
  @ApiResponse({ status: 200, description: 'List of tickets in queue', type: [KitchenTicketOutput] })
  async listQueue(@Query('restaurantId') restaurantId: string) {
    return this.listKitchenTicketsUseCase.execute({
      restaurantId,
      status: KitchenTicketStatus.WAITING,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRoleEnum.RESTAURANT, UserRoleEnum.ADMIN)
  @ApiOperation({ summary: 'Create kitchen ticket', description: 'Creates a new kitchen ticket for order preparation' })
  @ApiBody({ type: CreateKitchenTicketDto, description: 'Kitchen ticket data with order ID and items' })
  @ApiResponse({ status: 201, description: 'Kitchen ticket created', type: CreateKitchenTicketOutput })
  @ApiBadRequestResponse({ description: 'Invalid ticket data' })
  async create(@Body() input: CreateKitchenTicketDto) {
    return this.createKitchenTicketUseCase.execute(input);
  }

  @Get(':id')
  @Roles(UserRoleEnum.RESTAURANT, UserRoleEnum.ADMIN)
  @ApiOperation({ summary: 'Get kitchen ticket', description: 'Retrieves kitchen ticket details' })
  @ApiParam({ name: 'id', description: 'Kitchen ticket ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Kitchen ticket found', type: GetKitchenTicketDto })
  @ApiNotFoundResponse({ description: 'Kitchen ticket not found' })
  async get(@Param('id') id: string) {
    const ticket = await this.getKitchenTicketUseCase.execute(id);
    if (!ticket) {
      throw new NotFoundException(`Kitchen ticket ${id} not found`);
    }
    return ticket;
  }

  @Put(':id/status')
  @Roles(UserRoleEnum.RESTAURANT, UserRoleEnum.ADMIN)
  @ApiOperation({ summary: 'Update ticket status', description: 'Updates the status of a kitchen ticket' })
  @ApiParam({ name: 'id', description: 'Kitchen ticket ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ description: 'New status for the kitchen ticket', schema: { type: 'object', properties: { status: { type: 'string', enum: ['PENDING', 'PREPARING', 'READY', 'CANCELLED'], example: 'PREPARING' } } } })
  @ApiResponse({ status: 200, description: 'Ticket status updated', type: UpdateKitchenTicketOutput })
  @ApiNotFoundResponse({ description: 'Kitchen ticket not found' })
  async updateStatus(@Param('id') id: string, @Body('status') status: KitchenTicketStatus) {
    const result = await this.updateKitchenTicketStatusUseCase.execute(id, status);
    if (!result) {
      throw new NotFoundException(`Kitchen ticket ${id} not found`);
    }
    return result;
  }
}
