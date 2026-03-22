import { forwardRef, Module } from '@nestjs/common';
import { Gstr1Service } from './gstr1.service';
import { Gstr1Controller } from './gstr1.controller';
import {  PrismaModule } from 'src/prisma/prisma.module';
import { SellerModule } from 'src/seller/seller.module';

@Module({
   imports: [
    PrismaModule,
    forwardRef(() => SellerModule),  // ✅ forwardRef to break circular dependency
  ],
  controllers: [Gstr1Controller],
  providers: [Gstr1Service],
})
export class Gstr1Module {}
