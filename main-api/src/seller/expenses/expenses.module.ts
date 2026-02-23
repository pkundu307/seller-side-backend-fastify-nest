import { forwardRef, Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { SellerModule } from '../seller.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [  forwardRef(() => SellerModule),PrismaModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
