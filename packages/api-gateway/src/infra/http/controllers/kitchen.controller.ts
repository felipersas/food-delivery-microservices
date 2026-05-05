import { Controller, Get, Post, Param, Headers, UseInterceptors, Inject, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HttpProxyStrategy } from '../../strategies/http-proxy.strategy';
import { LoggingInterceptor } from '../../interceptors/logging.interceptor';
import { TimeoutInterceptor } from '../../interceptors/timeout.interceptor';
import {
  GetKitchenTicketsDto,
  GetKitchenTicketByIdDto,
  GetKitchenQueueDto,
  CompleteKitchenItemDto,
} from '../dto/kitchen.dto';

@ApiTags('kitchen')
@Controller('kitchen')
@UseInterceptors(LoggingInterceptor, TimeoutInterceptor)
export class KitchenController {
  constructor(
    @Inject('KITCHEN_SERVICE_URL') private readonly kitchenServiceUrl: string,
    private readonly proxy: HttpProxyStrategy,
  ) {}

  @Get('tickets')
  @ApiOperation({ summary: 'List kitchen tickets (proxy)', description: 'Proxies ticket listing to Kitchen Service' })
  @ApiBearerAuth()
  async getTickets(@Query() query: GetKitchenTicketsDto, @Headers('authorization') auth?: string) {
    const params = new URLSearchParams();
    if (query.status) params.append('status', query.status);
    if (query.restaurantId) params.append('restaurantId', query.restaurantId);

    const url = `${this.kitchenServiceUrl}/kitchen/tickets${params.toString() ? `?${params}` : ''}`;
    return this.proxy.get(url, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get kitchen ticket (proxy)', description: 'Proxies ticket retrieval to Kitchen Service' })
  @ApiBearerAuth()
  async getTicket(@Param() params: GetKitchenTicketByIdDto, @Headers('authorization') auth?: string) {
    return this.proxy.get(`${this.kitchenServiceUrl}/kitchen/tickets/${params.id}`, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Get('tickets/queue')
  @ApiOperation({ summary: 'Get kitchen queue (proxy)', description: 'Proxies queue retrieval to Kitchen Service' })
  @ApiBearerAuth()
  async getQueue(@Query() query: GetKitchenQueueDto, @Headers('authorization') auth?: string) {
    const params = new URLSearchParams();
    if (query.restaurantId) params.append('restaurantId', query.restaurantId);

    const url = `${this.kitchenServiceUrl}/kitchen/tickets/queue${params.toString() ? `?${params}` : ''}`;
    return this.proxy.get(url, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Post('tickets/:id/start')
  @ApiOperation({ summary: 'Start preparing (proxy)', description: 'Proxies start preparation to Kitchen Service' })
  @ApiBearerAuth()
  async startPreparing(@Param() params: GetKitchenTicketByIdDto, @Headers('authorization') auth?: string) {
    return this.proxy.post(`${this.kitchenServiceUrl}/kitchen/tickets/${params.id}/start`, {}, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Post('tickets/:id/ready')
  @ApiOperation({ summary: 'Mark as ready (proxy)', description: 'Proxies mark ready to Kitchen Service' })
  @ApiBearerAuth()
  async markReady(@Param() params: GetKitchenTicketByIdDto, @Headers('authorization') auth?: string) {
    return this.proxy.post(`${this.kitchenServiceUrl}/kitchen/tickets/${params.id}/ready`, {}, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Post('tickets/:id/items/:itemId/complete')
  @ApiOperation({ summary: 'Complete item (proxy)', description: 'Proxies item completion to Kitchen Service' })
  @ApiBearerAuth()
  async completeItem(@Param() params: CompleteKitchenItemDto, @Headers('authorization') auth?: string) {
    return this.proxy.post(`${this.kitchenServiceUrl}/kitchen/tickets/${params.id}/items/${params.itemId}/complete`, {}, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }
}
