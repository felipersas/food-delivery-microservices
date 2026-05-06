import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse, ApiNotFoundResponse, ApiQuery, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { Roles, UserRoleEnum } from '@app/shared';
import { CreateRestaurantUseCase } from '@application/use-cases/create-restaurant/create-restaurant.use-case';
import { GetRestaurantUseCase } from '@application/use-cases/get-restaurant/get-restaurant.use-case';
import { ListRestaurantsUseCase } from '@application/use-cases/list-restaurants/list-restaurants.use-case';
import { CreateRestaurantDto } from '@application/use-cases/create-restaurant/create-restaurant.dto';
import { ListRestaurantsDto } from '@application/use-cases/list-restaurants/list-restaurants.dto';
import type { GetRestaurantOutput } from '@application/use-cases/get-restaurant/get-restaurant.dto';
import { CreateMenuItemUseCase } from '@application/use-cases/create-menu-item/create-menu-item.use-case';
import { GetMenuItemUseCase } from '@application/use-cases/get-menu-item/get-menu-item.use-case';
import { ListMenuItemsUseCase } from '@application/use-cases/list-menu-items/list-menu-items.use-case';
import { UpdateMenuItemUseCase } from '@application/use-cases/update-menu-item/update-menu-item.use-case';
import { DeleteMenuItemUseCase } from '@application/use-cases/delete-menu-item/delete-menu-item.use-case';
import { CreateMenuItemDto } from '@application/use-cases/create-menu-item/create-menu-item.dto';
import { UpdateMenuItemDto } from '@application/use-cases/update-menu-item/update-menu-item.dto';
import { ListMenuItemsDto } from '@application/use-cases/list-menu-items/list-menu-items.dto';

@ApiTags('restaurants')
@ApiBearerAuth('JWT')
@Controller('restaurants')
export class RestaurantController {
  constructor(
    private readonly createRestaurantUseCase: CreateRestaurantUseCase,
    private readonly getRestaurantUseCase: GetRestaurantUseCase,
    private readonly listRestaurantsUseCase: ListRestaurantsUseCase,
    private readonly createMenuItemUseCase: CreateMenuItemUseCase,
    private readonly getMenuItemUseCase: GetMenuItemUseCase,
    private readonly listMenuItemsUseCase: ListMenuItemsUseCase,
    private readonly updateMenuItemUseCase: UpdateMenuItemUseCase,
    private readonly deleteMenuItemUseCase: DeleteMenuItemUseCase,
  ) {}

  @Post()
  @Roles(UserRoleEnum.ADMIN)
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
  @Roles(UserRoleEnum.CUSTOMER, UserRoleEnum.RESTAURANT, UserRoleEnum.ADMIN)
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
  @Roles(UserRoleEnum.CUSTOMER, UserRoleEnum.RESTAURANT, UserRoleEnum.ADMIN)
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

  // ==================== Menu Items ====================

  @Post(':restaurantId/menu-items')
  @Roles(UserRoleEnum.RESTAURANT, UserRoleEnum.ADMIN)
  @ApiOperation({
    summary: 'Create menu item',
    description: 'Creates a new menu item for a restaurant (only restaurant owner or admin)'
  })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: CreateMenuItemDto, description: 'Menu item data' })
  @ApiResponse({ status: 201, description: 'Menu item created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request data' })
  async createMenuItem(
    @Param('restaurantId') restaurantId: string,
    @Body() input: CreateMenuItemDto,
  ) {
    return this.createMenuItemUseCase.execute({ ...input, restaurantId });
  }

  @Get(':restaurantId/menu-items')
  @Roles(UserRoleEnum.CUSTOMER, UserRoleEnum.RESTAURANT, UserRoleEnum.ADMIN)
  @ApiOperation({
    summary: 'List restaurant menu items',
    description: 'Lists all menu items for a restaurant with optional filtering'
  })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiQuery({ name: 'category', required: false, enum: ['appetizer', 'main', 'dessert', 'drink', 'side'] })
  @ApiQuery({ name: 'available', required: false, description: 'Show only available items' })
  @ApiResponse({ status: 200, description: 'List of menu items' })
  async listMenuItems(
    @Param('restaurantId') restaurantId: string,
    @Query() query: ListMenuItemsDto,
  ) {
    return this.listMenuItemsUseCase.execute({ ...query, restaurantId });
  }

  @Get('menu-items/:id')
  @Roles(UserRoleEnum.CUSTOMER, UserRoleEnum.RESTAURANT, UserRoleEnum.ADMIN)
  @ApiOperation({
    summary: 'Get menu item by ID',
    description: 'Retrieves details of a specific menu item'
  })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: 200, description: 'Menu item found' })
  @ApiNotFoundResponse({ description: 'Menu item not found' })
  async getMenuItem(@Param('id') id: string) {
    return this.getMenuItemUseCase.execute(id);
  }

  @Patch('menu-items/:id')
  @Roles(UserRoleEnum.RESTAURANT, UserRoleEnum.ADMIN)
  @ApiOperation({
    summary: 'Update menu item',
    description: 'Updates a menu item (only restaurant owner or admin)'
  })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiBody({ type: UpdateMenuItemDto, description: 'Fields to update' })
  @ApiResponse({ status: 200, description: 'Menu item updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request data' })
  @ApiNotFoundResponse({ description: 'Menu item not found' })
  async updateMenuItem(
    @Param('id') id: string,
    @Body() input: UpdateMenuItemDto,
  ) {
    return this.updateMenuItemUseCase.execute(id, input);
  }

  @Delete('menu-items/:id')
  @Roles(UserRoleEnum.RESTAURANT, UserRoleEnum.ADMIN)
  @ApiOperation({
    summary: 'Delete menu item',
    description: 'Deletes a menu item (only restaurant owner or admin)'
  })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: 200, description: 'Menu item deleted successfully' })
  @ApiNotFoundResponse({ description: 'Menu item not found' })
  async deleteMenuItem(@Param('id') id: string) {
    return this.deleteMenuItemUseCase.execute(id);
  }
}
