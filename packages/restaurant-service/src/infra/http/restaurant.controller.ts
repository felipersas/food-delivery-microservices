import { Controller, Get, Post, Body, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse, ApiNotFoundResponse, ApiQuery } from '@nestjs/swagger';
import { CreateRestaurantUseCase } from '@application/use-cases/create-restaurant/create-restaurant.use-case';
import { GetRestaurantUseCase } from '@application/use-cases/get-restaurant/get-restaurant.use-case';
import { ListRestaurantsUseCase } from '@application/use-cases/list-restaurants/list-restaurants.use-case';
import { CreateRestaurantDto } from '@application/use-cases/create-restaurant/create-restaurant.dto';
import { ListRestaurantsDto } from '@application/use-cases/list-restaurants/list-restaurants.dto';
import type { GetRestaurantOutput } from '@application/use-cases/get-restaurant/get-restaurant.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantController {
  constructor(
    private readonly createRestaurantUseCase: CreateRestaurantUseCase,
    private readonly getRestaurantUseCase: GetRestaurantUseCase,
    private readonly listRestaurantsUseCase: ListRestaurantsUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new restaurant',
    description: 'Creates a new restaurant with profile information, address, and operating hours'
  })
  @ApiResponse({ status: 201, description: 'Restaurant created successfully', type: Object })
  @ApiBadRequestResponse({ description: 'Invalid request data' })
  async create(@Body() input: CreateRestaurantDto) {
    return this.createRestaurantUseCase.execute(input);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get restaurant by ID',
    description: 'Retrieves detailed information about a specific restaurant'
  })
  @ApiResponse({ status: 200, description: 'Restaurant found', type: Object })
  @ApiNotFoundResponse({ description: 'Restaurant not found' })
  async get(@Param('id') id: string): Promise<GetRestaurantOutput> {
    const result = await this.getRestaurantUseCase.execute(id);
    return result as GetRestaurantOutput;
  }

  @Get()
  @ApiOperation({
    summary: 'List restaurants',
    description: 'Lists restaurants with optional filtering by status, name search, geolocation, or owner'
  })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'active', 'suspended', 'inactive', 'closed'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lng', required: false })
  @ApiQuery({ name: 'radiusKm', required: false })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiResponse({ status: 200, description: 'List of restaurants', type: [Object] })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async list(@Query() query: ListRestaurantsDto): Promise<GetRestaurantOutput[]> {
    return this.listRestaurantsUseCase.execute(query);
  }
}
