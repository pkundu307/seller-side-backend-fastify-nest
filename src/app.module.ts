import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { CheckModule } from './check/check.module';
import { ProfileModule } from './profile/profile.module';
import { ProductsModule } from './products/products.module';
import { BusinessModule } from './business/business.module';
import { KeepAliveService } from './utils/keep-alive.service';
import { PrismaService } from './prisma/prisma.service';
import { ScheduleModule } from '@nestjs/schedule';
import { CategoryModule } from './category/category.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot(),
    PrismaModule,
    UserModule,
     JwtModule.registerAsync({
          useFactory: () => ({
            secret: "prasanna",
            signOptions: { expiresIn: '1h' },
          }),
        }),
    AuthModule,
    CheckModule,
    ProfileModule,
    ProductsModule,
    BusinessModule,
    CategoryModule,
    
  ],
  providers: [KeepAliveService, PrismaService],

})
export class AppModule {}
