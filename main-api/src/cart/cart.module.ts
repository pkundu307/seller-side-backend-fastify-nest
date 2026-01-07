import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { AuthModule } from 'src/auth/auth.module'; // Import AuthModule to use guards
import { S3Service } from 'src/products/utils/s3Service';

@Module({
  imports: [AuthModule],
  controllers: [CartController],
  providers: [CartService,S3Service],
})
export class CartModule {}