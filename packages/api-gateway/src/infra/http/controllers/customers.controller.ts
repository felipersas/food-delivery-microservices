import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  UseInterceptors,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HttpProxyStrategy } from '../../strategies/http-proxy.strategy';
import { LoggingInterceptor } from '../../interceptors/logging.interceptor';
import { TimeoutInterceptor } from '../../interceptors/timeout.interceptor';
import {
  CreateCustomerDto,
  UpdateCustomerProfileDto,
  AddCustomerAddressDto,
  SavePaymentMethodDto,
  ListCustomersDto,
  GetCustomerByIdDto,
  RemoveCustomerAddressDto,
  RemovePaymentMethodDto,
} from '../dto/customers.dto';
import { CUSTOMER_SERVICE_URL } from '../../../tokens';

@ApiTags('customers')
@Controller('customers')
@UseInterceptors(LoggingInterceptor, TimeoutInterceptor)
export class CustomersController {
  constructor(
    @Inject(CUSTOMER_SERVICE_URL) private readonly customerServiceUrl: string,
    private readonly proxy: HttpProxyStrategy,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create customer (proxy)', description: 'Proxies customer creation to Customer Service' })
  @ApiBearerAuth()
  async create(@Body() body: CreateCustomerDto, @Headers('authorization') auth?: string) {
    return this.proxy.post(`${this.customerServiceUrl}/customers`, body, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List customers (proxy)', description: 'Proxies customer list retrieval to Customer Service' })
  @ApiBearerAuth()
  async list(@Body() body: ListCustomersDto, @Headers('authorization') auth?: string) {
    return this.proxy.post(`${this.customerServiceUrl}/customers`, body, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID (proxy)', description: 'Proxies customer retrieval to Customer Service' })
  @ApiBearerAuth()
  async get(@Param() params: GetCustomerByIdDto, @Headers('authorization') auth?: string) {
    return this.proxy.get(`${this.customerServiceUrl}/customers/${params.id}`, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer profile (proxy)', description: 'Proxies customer profile update to Customer Service' })
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCustomerProfileDto,
    @Headers('authorization') auth?: string,
  ) {
    return this.proxy.patch(`${this.customerServiceUrl}/customers/${id}`, body, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Post(':id/addresses')
  @ApiOperation({ summary: 'Add customer address (proxy)', description: 'Proxies address creation to Customer Service' })
  @ApiBearerAuth()
  async addAddress(
    @Param('id') id: string,
    @Body() body: AddCustomerAddressDto,
    @Headers('authorization') auth?: string,
  ) {
    return this.proxy.post(`${this.customerServiceUrl}/customers/${id}/addresses`, body, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Delete(':id/addresses/:addressIndex')
  @ApiOperation({ summary: 'Remove customer address (proxy)', description: 'Proxies address removal to Customer Service' })
  @ApiBearerAuth()
  async removeAddress(
    @Param() params: RemoveCustomerAddressDto,
    @Headers('authorization') auth?: string,
  ) {
    return this.proxy.delete(
      `${this.customerServiceUrl}/customers/${params.id}/addresses/${params.addressIndex}`,
      {
        headers: auth ? { authorization: auth } : undefined,
      },
    );
  }

  @Post(':id/payment-methods')
  @ApiOperation({ summary: 'Save payment method (proxy)', description: 'Proxies payment method creation to Customer Service' })
  @ApiBearerAuth()
  async savePaymentMethod(
    @Param('id') id: string,
    @Body() body: SavePaymentMethodDto,
    @Headers('authorization') auth?: string,
  ) {
    return this.proxy.post(`${this.customerServiceUrl}/customers/${id}/payment-methods`, body, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Delete(':id/payment-methods/:paymentMethodIndex')
  @ApiOperation({ summary: 'Remove payment method (proxy)', description: 'Proxies payment method removal to Customer Service' })
  @ApiBearerAuth()
  async removePaymentMethod(
    @Param() params: RemovePaymentMethodDto,
    @Headers('authorization') auth?: string,
  ) {
    return this.proxy.delete(
      `${this.customerServiceUrl}/customers/${params.id}/payment-methods/${params.paymentMethodIndex}`,
      {
        headers: auth ? { authorization: auth } : undefined,
      },
    );
  }
}
