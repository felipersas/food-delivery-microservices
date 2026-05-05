import { Controller, Post, Get, Body, Param, Headers, UseInterceptors, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HttpProxyStrategy } from '../../strategies/http-proxy.strategy';
import { LoggingInterceptor } from '../../interceptors/logging.interceptor';
import { TimeoutInterceptor } from '../../interceptors/timeout.interceptor';
import { CreatePaymentDto, GetPaymentByIdDto } from '../dto/payments.dto';

@ApiTags('payments')
@Controller('payments')
@UseInterceptors(LoggingInterceptor, TimeoutInterceptor)
export class PaymentsController {
  constructor(
    @Inject('PAYMENT_SERVICE_URL') private readonly paymentServiceUrl: string,
    private readonly proxy: HttpProxyStrategy,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create payment (proxy)', description: 'Proxies payment creation to Payment Service' })
  @ApiBearerAuth()
  async create(@Body() body: CreatePaymentDto, @Headers('authorization') auth?: string) {
    return this.proxy.post(`${this.paymentServiceUrl}/payments`, body, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID (proxy)', description: 'Proxies payment retrieval to Payment Service' })
  @ApiBearerAuth()
  async get(@Param() params: GetPaymentByIdDto, @Headers('authorization') auth?: string) {
    return this.proxy.get(`${this.paymentServiceUrl}/payments/${params.id}`, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }
}
