import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  getSummary(@Query('period') period: 'today' | 'week' | 'month' = 'today') {
    return this.service.getSummary(period);
  }
}
