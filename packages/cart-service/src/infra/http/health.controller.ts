import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApiHealth, ApiHealthResponse } from '@app/health';

@ApiTags('health')
@ApiBearerAuth('JWT', { required: false })
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Returns service health status' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  health(): ApiHealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
