import {
  Controller,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRoleEnum } from '@app/shared';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user/get-current-user.use-case';
import { UpdateUserUseCase } from '../../application/use-cases/update-user/update-user.use-case';
import { ChangeStatusUseCase } from '../../application/use-cases/change-status/change-status.use-case';
import { ManageRolesUseCase } from '../../application/use-cases/manage-roles/manage-roles.use-case';
import { RevokeAllTokensUseCase } from '../../application/use-cases/revoke-tokens/revoke-all-tokens.use-case';
import { UpdateUserDto } from '../../application/use-cases/update-user/update-user.dto';
import { ChangeStatusDto } from '../../application/use-cases/change-status/change-status.dto';
import { ManageRolesDto } from '../../application/use-cases/manage-roles/manage-roles.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'Authorization', description: 'Bearer JWT token' })
export class UserController {
  constructor(
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly changeStatusUseCase: ChangeStatusUseCase,
    private readonly manageRolesUseCase: ManageRolesUseCase,
    private readonly revokeAllTokensUseCase: RevokeAllTokensUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getCurrentUser(@Req() req: any) {
    return this.getCurrentUserUseCase.execute(req.user.userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateCurrentUser(@Req() req: any, @Body() input: UpdateUserDto) {
    return this.updateUserUseCase.execute(req.user.userId, input);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.ADMIN)
  @ApiOperation({ summary: 'Change user status (admin only)' })
  @ApiResponse({ status: 200, description: 'Status changed' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async changeStatus(@Param('id') id: string, @Body() input: ChangeStatusDto) {
    return this.changeStatusUseCase.execute(id, input);
  }

  @Patch(':id/roles')
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.ADMIN)
  @ApiOperation({ summary: 'Add or remove user role (admin only)' })
  @ApiResponse({ status: 200, description: 'Roles updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async manageRoles(@Param('id') id: string, @Body() input: ManageRolesDto) {
    return this.manageRolesUseCase.execute(id, input);
  }

  @Delete('me/tokens')
  @ApiOperation({ summary: 'Revoke all refresh tokens (logout everywhere)' })
  @ApiResponse({ status: 200, description: 'All tokens revoked' })
  async revokeAllTokens(@Req() req: any) {
    return this.revokeAllTokensUseCase.execute(req.user.userId);
  }
}
