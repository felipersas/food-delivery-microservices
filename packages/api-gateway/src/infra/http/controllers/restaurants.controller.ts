import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseInterceptors,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HttpProxyStrategy } from '../../strategies/http-proxy.strategy';
import { LoggingInterceptor } from '../../interceptors/logging.interceptor';
import { TimeoutInterceptor } from '../../interceptors/timeout.interceptor';
import {
  CreateRestaurantDto,
  ListRestaurantsDto,
  GetRestaurantByIdDto,
  CreateMenuItemDto,
  ListMenuItemsForRestaurantDto,
  UpdateMenuItemDto,
  GetMenuItemByIdDto,
} from '../dto/restaurants.dto';
import { RESTAURANT_SERVICE_URL } from '../../../tokens';

@ApiTags('restaurants')
@Controller('restaurants')
@UseInterceptors(LoggingInterceptor, TimeoutInterceptor)
export class RestaurantsController {
  constructor(
    @Inject(RESTAURANT_SERVICE_URL) private readonly restaurantServiceUrl: string,
    private readonly proxy: HttpProxyStrategy,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create restaurant (proxy)', description: 'Proxies restaurant creation to Restaurant Service' })
  @ApiBearerAuth()
  async create(@Body() body: CreateRestaurantDto, @Headers('authorization') auth?: string) {
    return this.proxy.post(`${this.restaurantServiceUrl}/restaurants`, body, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant by ID (proxy)', description: 'Proxies restaurant retrieval to Restaurant Service' })
  @ApiBearerAuth()
  async get(@Param() params: GetRestaurantByIdDto, @Headers('authorization') auth?: string) {
    return this.proxy.get(`${this.restaurantServiceUrl}/restaurants/${params.id}`, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List restaurants (proxy)', description: 'Proxies restaurant list retrieval to Restaurant Service' })
  @ApiBearerAuth()
  async list(@Query() query: ListRestaurantsDto, @Headers('authorization') auth?: string) {
    const queryParams = new URLSearchParams();
    if (query.status) queryParams.set('status', query.status);
    if (query.search) queryParams.set('search', query.search);
    if (query.lat !== undefined) queryParams.set('lat', query.lat.toString());
    if (query.lng !== undefined) queryParams.set('lng', query.lng.toString());
    if (query.radiusKm !== undefined) queryParams.set('radiusKm', query.radiusKm.toString());
    if (query.ownerId) queryParams.set('ownerId', query.ownerId);

    const queryString = queryParams.toString();
    const url = `${this.restaurantServiceUrl}/restaurants${queryString ? `?${queryString}` : ''}`;

    return this.proxy.get(url, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  // ==================== Menu Items ====================

  @Post(':restaurantId/menu-items')
  @ApiOperation({ summary: 'Create menu item (proxy)', description: 'Proxies menu item creation to Restaurant Service' })
  @ApiBearerAuth()
  async createMenuItem(
    @Param('restaurantId') restaurantId: string,
    @Body() body: CreateMenuItemDto,
    @Headers('authorization') auth?: string,
  ) {
    return this.proxy.post(`${this.restaurantServiceUrl}/restaurants/${restaurantId}/menu-items`, body, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Get(':restaurantId/menu-items')
  @ApiOperation({ summary: 'List restaurant menu items (proxy)', description: 'Proxies menu item list retrieval to Restaurant Service' })
  @ApiBearerAuth()
  async listMenuItems(
    @Param('restaurantId') restaurantId: string,
    @Query() query: ListMenuItemsForRestaurantDto,
    @Headers('authorization') auth?: string,
  ) {
    const queryParams = new URLSearchParams();
    if (query.category) queryParams.set('category', query.category);
    if (query.available !== undefined) queryParams.set('available', query.available.toString());

    const queryString = queryParams.toString();
    const url = `${this.restaurantServiceUrl}/restaurants/${restaurantId}/menu-items${queryString ? `?${queryString}` : ''}`;

    return this.proxy.get(url, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Get('menu-items/:id')
  @ApiOperation({ summary: 'Get menu item by ID (proxy)', description: 'Proxies menu item retrieval to Restaurant Service' })
  @ApiBearerAuth()
  async getMenuItem(@Param() params: GetMenuItemByIdDto, @Headers('authorization') auth?: string) {
    return this.proxy.get(`${this.restaurantServiceUrl}/restaurants/menu-items/${params.id}`, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Patch('menu-items/:id')
  @ApiOperation({ summary: 'Update menu item (proxy)', description: 'Proxies menu item update to Restaurant Service' })
  @ApiBearerAuth()
  async updateMenuItem(
    @Param('id') id: string,
    @Body() body: UpdateMenuItemDto,
    @Headers('authorization') auth?: string,
  ) {
    return this.proxy.patch(`${this.restaurantServiceUrl}/restaurants/menu-items/${id}`, body, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Delete('menu-items/:id')
  @ApiOperation({ summary: 'Delete menu item (proxy)', description: 'Proxies menu item deletion to Restaurant Service' })
  @ApiBearerAuth()
  async deleteMenuItem(@Param('id') id: string, @Headers('authorization') auth?: string) {
    return this.proxy.delete(`${this.restaurantServiceUrl}/restaurants/menu-items/${id}`, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }
}
