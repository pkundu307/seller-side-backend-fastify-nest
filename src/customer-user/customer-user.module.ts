import { Module } from '@nestjs/common';
import { CustomerUserService } from './customer-user.service';
import { CustomerUserController } from './customer-user.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // Import PrismaModule
  controllers: [CustomerUserController],
  providers: [CustomerUserService],
  exports: [CustomerUserService], // Export the service so other modules can use it
})
export class CustomerUserModule {}