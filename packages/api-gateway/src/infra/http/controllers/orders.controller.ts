import { Controller, Get, Post, Body, Param, Headers, UseInterceptors, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { HttpProxyStrategy } from '../../strategies/http-proxy.strategy';
import { LoggingInterceptor } from '../../interceptors/logging.interceptor';
import { TimeoutInterceptor } from '../../interceptors/timeout.interceptor';
import { CreateOrderDto, GetOrderByIdDto, GetOrdersByCustomerDto } from '../dto/orders.dto';

@ApiTags('orders')
@Controller('orders')
@UseInterceptors(LoggingInterceptor, TimeoutInterceptor)
export class OrdersController {
  constructor(
    @Inject('ORDER_SERVICE_URL') private readonly orderServiceUrl: string,
    private readonly proxy: HttpProxyStrategy,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create order (proxy)', description: 'Proxies order creation to Order Service' })
  @ApiBearerAuth()
  async create(@Body() body: CreateOrderDto, @Headers('authorization') auth?: string) {
    return this.proxy.post(`${this.orderServiceUrl}/orders`, body, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID (proxy)', description: 'Proxies order retrieval to Order Service' })
  @ApiBearerAuth()
  async get(@Param() params: GetOrderByIdDto, @Headers('authorization') auth?: string) {
    return this.proxy.get(`${this.orderServiceUrl}/orders/${params.id}`, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get order status (proxy)', description: 'Proxies status retrieval to Order Service' })
  @ApiBearerAuth()
  async getStatus(@Param('id') id: string, @Headers('authorization') auth?: string) {
    return this.proxy.get(`${this.orderServiceUrl}/orders/${id}/status`, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get orders by customer (proxy)', description: 'Proxies customer orders retrieval to Order Service' })
  @ApiBearerAuth()
  async getByCustomer(
    @Param() params: GetOrdersByCustomerDto,
    @Headers('authorization') auth?: string,
  ) {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const url = `${this.orderServiceUrl}/orders/customer/${params.customerId}${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.proxy.get(url, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }
}
