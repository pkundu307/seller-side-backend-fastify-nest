import { Module } from '@nestjs/common';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module'; // <--- Import this
import { S3Service } from 'src/products/utils/s3Service';

@Module({
  imports: [RabbitMQModule], 
  controllers: [BusinessController],
  providers: [BusinessService,
    S3Service
  ],
})
export class BusinessModule {}
