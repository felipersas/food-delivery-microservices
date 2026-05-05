import { Controller, Post, Get, Body, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse, ApiNotFoundResponse, ApiBody } from '@nestjs/swagger';
import { CreateOrderUseCase } from '@application/use-cases/create-order/create-order.use-case';
import { GetOrderUseCase } from '@application/use-cases/get-order/get-order.use-case';
import { CreateOrderDto } from '@application/use-cases/create-order/create-order.dto';
import { GetOrderOutput } from '@application/use-cases/get-order/get-order.dto';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getOrderUseCase: GetOrderUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order', description: 'Creates a new order with items for a customer at a restaurant' })
  @ApiBody({ type: CreateOrderDto, description: 'Order data with customer ID, restaurant ID, and items' })
  @ApiResponse({ status: 201, description: 'Order created successfully', type: GetOrderOutput })
  @ApiBadRequestResponse({ description: 'Invalid request data' })
  async create(@Body() input: CreateOrderDto) {
    return this.createOrderUseCase.execute(input);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID', description: 'Retrieves a specific order by its ID' })
  @ApiResponse({ status: 200, description: 'Order found', type: GetOrderOutput })
  @ApiNotFoundResponse({ description: 'Order not found' })
  async get(@Param('id') id: string) {
    const order = await this.getOrderUseCase.execute(id);
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    return order;
  }
}
