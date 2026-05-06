import { SetMetadata, UseGuards } from '@nestjs/common';
import { ResourceOwnerGuard } from '../guards/resource-owner.guard';
import { RESOURCE_OWNER_GUARD_OPTIONS, type ResourceOwnerGuardOptions } from '../guards/resource-owner.guard';

/**
 * ResourceOwnerGuard decorator
 *
 * Validates that the authenticated user is the owner of the resource.
 * ADMIN users bypass ownership check by default.
 *
 * Usage:
 * @Get('my-profile')
 * @ResourceOwner()
 * getMyProfile() { ... }
 *
 * @Get('restaurant/:restaurantId/menu')
 * @ResourceOwner({ ownerIdParam: 'restaurantId' })
 * getRestaurantMenu() { ... }
 *
 * @Get('kitchen/:kitchenId/orders')
 * @ResourceOwner({
 *   extractOwnerId: (req) => req.kitchen.restaurantId,
 *   allowAdmin: true
 * })
 * getKitchenOrders() { ... }
 */
export function ResourceOwner(options: ResourceOwnerGuardOptions = {}) {
  return SetMetadata(RESOURCE_OWNER_GUARD_OPTIONS, options);
}

/**
 * UseResourceOwner decorator - shorthand for @ResourceOwner() @UseGuards(ResourceOwnerGuard)
 *
 * @Get('my-orders')
 * @UseResourceOwner()
 * getMyOrders() { ... }
 */
export function UseResourceOwner(options: ResourceOwnerGuardOptions = {}) {
  return UseGuards(ResourceOwnerGuard, ResourceOwner(options));
}
