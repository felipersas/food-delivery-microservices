import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CreateOrderUseCase } from '@application/use-cases/create-order/create-order.use-case';
import { GetOrderUseCase } from '@application/use-cases/get-order/get-order.use-case';
import type { CreateOrderDto } from '@application/use-cases/create-order/create-order.dto';

@Controller('orders')
export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getOrderUseCase: GetOrderUseCase,
  ) {}

  @Post()
  async create(@Body() input: CreateOrderDto) {
    return this.createOrderUseCase.execute(input);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const order = await this.getOrderUseCase.execute(id);
    if (!order) {
      return { error: 'Order not found' };
    }
    return order;
  }
}
