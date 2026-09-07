import { Controller, Get } from '@nestjs/common';

/** Health check público (no requiere tenant). */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'operaciones', ts: new Date().toISOString() };
  }
}
