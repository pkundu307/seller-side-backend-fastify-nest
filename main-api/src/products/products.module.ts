import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module'; // ✅ Import this
import { S3Service } from './utils/s3Service';

@Module({
  imports: [
    PrismaModule,
    // JwtModule.register({
    //   secret: 'prasanna',
    //   signOptions: { expiresIn: '1h' },
    // }),
    AuthModule, // ✅ Add this
  ],
  controllers: [ProductsController],
  providers: [ProductsService,S3Service],
})
export class ProductsModule {}
