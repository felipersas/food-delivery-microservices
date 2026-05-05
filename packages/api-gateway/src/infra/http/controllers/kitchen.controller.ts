import { Controller, Get, Post, Param, Headers, UseInterceptors, Inject, Query } from '@nestjs/common';
import type { HttpProxyStrategy } from '../../strategies/http-proxy.strategy';
import { LoggingInterceptor } from '../../interceptors/logging.interceptor';
import { TimeoutInterceptor } from '../../interceptors/timeout.interceptor';

@Controller('kitchen')
@UseInterceptors(LoggingInterceptor, TimeoutInterceptor)
export class KitchenController {
  constructor(
    @Inject('KITCHEN_SERVICE_URL') private readonly kitchenServiceUrl: string,
    private readonly proxy: HttpProxyStrategy,
  ) {}

  @Get('tickets')
  async getTickets(
    @Query('status') status?: string,
    @Query('restaurantId') restaurantId?: string,
    @Headers('authorization') auth?: string,
  ) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (restaurantId) params.append('restaurantId', restaurantId);

    const url = `${this.kitchenServiceUrl}/kitchen/tickets${params.toString() ? `?${params}` : ''}`;
    return this.proxy.get(url, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Get('tickets/:id')
  async getTicket(@Param('id') id: string, @Headers('authorization') auth?: string) {
    return this.proxy.get(`${this.kitchenServiceUrl}/kitchen/tickets/${id}`, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Get('tickets/queue')
  async getQueue(
    @Query('restaurantId') restaurantId?: string,
    @Headers('authorization') auth?: string,
  ) {
    const params = new URLSearchParams();
    if (restaurantId) params.append('restaurantId', restaurantId);

    const url = `${this.kitchenServiceUrl}/kitchen/tickets/queue${params.toString() ? `?${params}` : ''}`;
    return this.proxy.get(url, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Post('tickets/:id/start')
  async startPreparing(@Param('id') id: string, @Headers('authorization') auth?: string) {
    return this.proxy.post(`${this.kitchenServiceUrl}/kitchen/tickets/${id}/start`, {}, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Post('tickets/:id/ready')
  async markReady(@Param('id') id: string, @Headers('authorization') auth?: string) {
    return this.proxy.post(`${this.kitchenServiceUrl}/kitchen/tickets/${id}/ready`, {}, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Post('tickets/:id/items/:itemId/complete')
  async completeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Headers('authorization') auth?: string,
  ) {
    return this.proxy.post(`${this.kitchenServiceUrl}/kitchen/tickets/${id}/items/${itemId}/complete`, {}, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }
}
