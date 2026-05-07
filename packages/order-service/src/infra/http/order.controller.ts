import { Controller, Post, Get, Body, Param, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse, ApiNotFoundResponse, ApiBody, ApiBearerAuth, ApiForbiddenResponse } from '@nestjs/swagger';
import { CreateOrderUseCase } from '@application/use-cases/create-order/create-order.use-case';
import { GetOrderUseCase } from '@application/use-cases/get-order/get-order.use-case';
import { ListOrdersUseCase } from '@application/use-cases/list-orders/list-orders.use-case';
import { CreateOrderDto } from '@application/use-cases/create-order/create-order.dto';
import { GetOrderOutput } from '@application/use-cases/get-order/get-order.dto';
import { UserContext, Roles, CurrentUser, UserRoleEnum } from '@app/shared';

@ApiTags('orders')
@ApiBearerAuth('JWT')
@Controller('orders')
export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getOrderUseCase: GetOrderUseCase,
    private readonly listOrdersUseCase: ListOrdersUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order', description: 'Creates a new order with items for a customer at a restaurant' })
  @ApiBody({ type: CreateOrderDto, description: 'Order data with customer ID, restaurant ID, and items' })
  @ApiResponse({ status: 201, description: 'Order created successfully', type: GetOrderOutput })
  @ApiBadRequestResponse({ description: 'Invalid request data' })
  @Roles(UserRoleEnum.CUSTOMER, UserRoleEnum.ADMIN)
  async create(@Body() input: CreateOrderDto, @CurrentUser() user: UserContext) {
    // Override customerId with authenticated user (security)
    const orderInput = { ...input, customerId: user.userId };
    return this.createOrderUseCase.execute(orderInput);
  }

  @Get()
  @ApiOperation({ summary: 'List customer orders', description: 'Retrieves all orders for the authenticated customer' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @Roles(UserRoleEnum.CUSTOMER, UserRoleEnum.ADMIN)
  async list(@CurrentUser() user: UserContext) {
    return this.listOrdersUseCase.execute({
      customerId: user.userId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID', description: 'Retrieves a specific order by its ID' })
  @ApiResponse({ status: 200, description: 'Order found', type: GetOrderOutput })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiForbiddenResponse({ description: 'Access denied - order belongs to another user' })
  @Roles(UserRoleEnum.CUSTOMER, UserRoleEnum.ADMIN, UserRoleEnum.RESTAURANT)
  async get(@Param('id') id: string, @CurrentUser() user: UserContext) {
    const order = await this.getOrderUseCase.execute(id);
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    // Ownership check: customers can only see their own orders
    if (user.hasRole(UserRoleEnum.CUSTOMER) && order.customerId !== user.userId) {
      throw new ForbiddenException('Access denied - order belongs to another user');
    }

    // Restaurants can only see orders for their restaurant
    if (user.hasRole(UserRoleEnum.RESTAURANT) && order.restaurantId !== user.userId) {
      throw new ForbiddenException('Access denied - order is for another restaurant');
    }

    return order;
  }
}
