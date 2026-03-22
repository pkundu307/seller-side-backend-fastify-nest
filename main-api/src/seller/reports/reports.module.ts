import { forwardRef, Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { SellerModule } from '../seller.module';
import { Gstr1Module } from './gstr1/gstr1.module';

@Module({
   imports: [
    forwardRef(() => SellerModule),
    Gstr1Module // Handle circular dependency
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
