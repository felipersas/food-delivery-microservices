import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Check if the restaurant service is running' })
  @ApiResponse({ status: 200, schema: { example: { status: 'ok', service: 'restaurant-service' } } })
  healthCheck() {
    return {
      status: 'ok',
      service: 'restaurant-service',
      timestamp: new Date().toISOString(),
    };
  }
}
