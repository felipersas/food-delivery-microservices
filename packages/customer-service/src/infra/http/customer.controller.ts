import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, ValidationPipe, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse, ApiNotFoundResponse, ApiParam } from '@nestjs/swagger';
import { CreateCustomerUseCase } from '../../application/use-cases/create-customer/create-customer.use-case';
import { GetCustomerUseCase } from '../../application/use-cases/get-customer/get-customer.use-case';
import { UpdateCustomerProfileUseCase } from '../../application/use-cases/update-customer-profile/update-customer-profile.use-case';
import { AddCustomerAddressUseCase } from '../../application/use-cases/add-customer-address/add-customer-address.use-case';
import { RemoveCustomerAddressUseCase } from '../../application/use-cases/remove-customer-address/remove-customer-address.use-case';
import { SavePaymentMethodUseCase } from '../../application/use-cases/save-payment-method/save-payment-method.use-case';
import { RemovePaymentMethodUseCase } from '../../application/use-cases/remove-payment-method/remove-payment-method.use-case';
import { ListCustomersUseCase } from '../../application/use-cases/list-customers/list-customers.use-case';
import type { CreateCustomerDto } from '../../application/use-cases/create-customer/create-customer.dto';
import type { UpdateCustomerProfileDto } from '../../application/use-cases/update-customer-profile/update-customer-profile.dto';
import type { AddCustomerAddressDto } from '../../application/use-cases/add-customer-address/add-customer-address.dto';
import type { SavePaymentMethodDto } from '../../application/use-cases/save-payment-method/save-payment-method.dto';
import type { ListCustomersDto } from '../../application/use-cases/list-customers/list-customers.dto';
import { CreateCustomerOutput } from '../../application/use-cases/create-customer/create-customer.dto';
import { GetCustomerOutput } from '../../application/use-cases/get-customer/get-customer.dto';
import { UpdateCustomerProfileOutput } from '../../application/use-cases/update-customer-profile/update-customer-profile.dto';
import { AddCustomerAddressOutput } from '../../application/use-cases/add-customer-address/add-customer-address.dto';
import { RemoveCustomerAddressOutput } from '../../application/use-cases/remove-customer-address/remove-customer-address.dto';
import { SavePaymentMethodOutput } from '../../application/use-cases/save-payment-method/save-payment-method.dto';
import { RemovePaymentMethodOutput } from '../../application/use-cases/remove-payment-method/remove-payment-method.dto';
import { ListCustomersOutput } from '../../application/use-cases/list-customers/list-customers.dto';

@ApiTags('customers')
@Controller('customers')
export class CustomerController {
  constructor(
    private readonly createCustomerUseCase: CreateCustomerUseCase,
    private readonly getCustomerUseCase: GetCustomerUseCase,
    private readonly updateCustomerProfileUseCase: UpdateCustomerProfileUseCase,
    private readonly addCustomerAddressUseCase: AddCustomerAddressUseCase,
    private readonly removeCustomerAddressUseCase: RemoveCustomerAddressUseCase,
    private readonly savePaymentMethodUseCase: SavePaymentMethodUseCase,
    private readonly removePaymentMethodUseCase: RemovePaymentMethodUseCase,
    private readonly listCustomersUseCase: ListCustomersUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer', description: 'Registers a new customer in the system with name, email, and phone' })
  @ApiResponse({ status: 201, description: 'Customer created successfully', type: CreateCustomerOutput })
  @ApiBadRequestResponse({ description: 'Invalid request data (validation failed)' })
  async create(@Body(ValidationPipe) input: CreateCustomerDto) {
    return this.createCustomerUseCase.execute(input);
  }

  @Get()
  @ApiOperation({ summary: 'List all customers', description: 'Retrieves a paginated list of customers with optional filtering and sorting' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully', type: ListCustomersOutput })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  async list(@Body(ValidationPipe) input: ListCustomersDto) {
    return this.listCustomersUseCase.execute(input);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID', description: 'Retrieves a specific customer by its ID including addresses and payment methods' })
  @ApiParam({ name: 'id', description: 'Customer ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Customer found', type: GetCustomerOutput })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  async get(@Param('id') id: string) {
    const customer = await this.getCustomerUseCase.execute(id);
    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    return customer;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer profile', description: 'Updates customer name, email, or phone. All fields are optional.' })
  @ApiParam({ name: 'id', description: 'Customer ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully', type: UpdateCustomerProfileOutput })
  @ApiBadRequestResponse({ description: 'Invalid request data' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  async updateProfile(
    @Param('id') id: string,
    @Body(ValidationPipe) input: UpdateCustomerProfileDto,
  ) {
    return this.updateCustomerProfileUseCase.execute({ id, ...input });
  }

  @Post(':id/addresses')
  @ApiOperation({ summary: 'Add address to customer', description: 'Adds a new delivery address to the customer profile. The first address becomes default.' })
  @ApiParam({ name: 'id', description: 'Customer ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 201, description: 'Address added successfully', type: AddCustomerAddressOutput })
  @ApiBadRequestResponse({ description: 'Invalid address data' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  async addAddress(
    @Param('id') id: string,
    @Body(ValidationPipe) input: AddCustomerAddressDto,
  ) {
    return this.addCustomerAddressUseCase.execute({ customerId: id, ...input });
  }

  @Delete(':id/addresses/:addressIndex')
  @ApiOperation({ summary: 'Remove customer address', description: 'Removes a delivery address from the customer profile by index' })
  @ApiParam({ name: 'id', description: 'Customer ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiParam({ name: 'addressIndex', description: 'Address index in the addresses array', example: 0 })
  @ApiResponse({ status: 200, description: 'Address removed successfully', type: RemoveCustomerAddressOutput })
  @ApiBadRequestResponse({ description: 'Invalid address index' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  async removeAddress(
    @Param('id') id: string,
    @Param('addressIndex', ParseIntPipe) addressIndex: number,
  ) {
    return this.removeCustomerAddressUseCase.execute({ customerId: id, addressIndex });
  }

  @Post(':id/payment-methods')
  @ApiOperation({ summary: 'Save payment method', description: 'Saves a payment method for the customer (stores only last 4 digits for security). The first payment method becomes default.' })
  @ApiParam({ name: 'id', description: 'Customer ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 201, description: 'Payment method saved successfully', type: SavePaymentMethodOutput })
  @ApiBadRequestResponse({ description: 'Invalid payment method data' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  async savePaymentMethod(
    @Param('id') id: string,
    @Body(ValidationPipe) input: SavePaymentMethodDto,
  ) {
    return this.savePaymentMethodUseCase.execute({ customerId: id, ...input });
  }

  @Delete(':id/payment-methods/:paymentMethodIndex')
  @ApiOperation({ summary: 'Remove payment method', description: 'Removes a saved payment method from the customer profile by index' })
  @ApiParam({ name: 'id', description: 'Customer ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiParam({ name: 'paymentMethodIndex', description: 'Payment method index in the array', example: 0 })
  @ApiResponse({ status: 200, description: 'Payment method removed successfully', type: RemovePaymentMethodOutput })
  @ApiBadRequestResponse({ description: 'Invalid payment method index' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  async removePaymentMethod(
    @Param('id') id: string,
    @Param('paymentMethodIndex', ParseIntPipe) paymentMethodIndex: number,
  ) {
    return this.removePaymentMethodUseCase.execute({ customerId: id, paymentMethodIndex });
  }
}
