import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { CheckModule } from './check/check.module';
import { KeepAliveService } from './utils/keep-alive.service';
import { PrismaService } from './prisma/prisma.service';
import { ScheduleModule } from '@nestjs/schedule';
import { CategoryModule } from './category/category.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { ProductsModule } from './products/products.module';
import { CustomerUserModule } from './customer-user/customer-user.module';
import { CustomerModule } from './customer/customer.module';
import { AttributesModule } from './attributes/attributes.module';
import { AdminModule } from './admin/admin.module';
import { BannerModule } from './banner/banner.module';
import { CartModule } from './cart/cart.module';
import { CustomizationImageModule } from './customization-image/customization-image.module';
import { ProductSearchModule } from './product-search/product-search.module';
import { OrderModule } from './order/order.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot(),
    PrismaModule,

     JwtModule.registerAsync({
          useFactory: () => ({
             global: true,
            secret: "prasanna",
            signOptions: { expiresIn: '1h' },
          }),
        }),
    
    CheckModule,
   
    CategoryModule,
   
    UserModule,
   
    AuthModule,
   
    BusinessModule,
   
    ProductsModule,
   
    CustomerUserModule,
   
    CustomerModule,
   
    AttributesModule,
   
    AdminModule,
   
    BannerModule,
   
    CartModule,
   
    CustomizationImageModule,
   
    ProductSearchModule,
   
    OrderModule    
  ],
  providers: [PrismaService],

})
export class AppModule {}
