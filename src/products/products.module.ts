import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { JwtModule } from '@nestjs/jwt';
import { S3Service } from './util/S3Service'; // 👈 Add this

@Module({
  controllers: [ProductsController],
  providers: [ProductsService,S3Service],

})
export class ProductsModule {}
