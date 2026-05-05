import { Controller, Get, Post, Body, Param, Headers, UseInterceptors, Inject, Query } from '@nestjs/common';
import type { HttpProxyStrategy } from '@infra/strategies/http-proxy.strategy';
import { LoggingInterceptor } from '@infra/interceptors/logging.interceptor';
import { TimeoutInterceptor } from '@infra/interceptors/timeout.interceptor';

@Controller('orders')
@UseInterceptors(LoggingInterceptor, TimeoutInterceptor)
export class OrdersController {
  constructor(
    @Inject('ORDER_SERVICE_URL') private readonly orderServiceUrl: string,
    private readonly proxy: HttpProxyStrategy,
  ) {}

  @Post()
  async create(@Body() body: any, @Headers('authorization') auth?: string) {
    return this.proxy.post(`${this.orderServiceUrl}/orders`, body, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Headers('authorization') auth?: string) {
    return this.proxy.get(`${this.orderServiceUrl}/orders/${id}`, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string, @Headers('authorization') auth?: string) {
    return this.proxy.get(`${this.orderServiceUrl}/orders/${id}/status`, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Get('customer/:customerId')
  async getByCustomer(
    @Param('customerId') customerId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Headers('authorization') auth?: string,
  ) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (offset) params.append('offset', offset);

    const url = `${this.orderServiceUrl}/orders/customer/${customerId}${params.toString() ? `?${params}` : ''}`;
    return this.proxy.get(url, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }
}
