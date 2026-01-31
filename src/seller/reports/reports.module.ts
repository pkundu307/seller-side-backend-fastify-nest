import { forwardRef, Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { SellerModule } from '../seller.module';

@Module({
   imports: [
    forwardRef(() => SellerModule) // Handle circular dependency
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
