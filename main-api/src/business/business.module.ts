import { Module } from '@nestjs/common';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module'; // <--- Import this

@Module({
  imports: [RabbitMQModule], 
  controllers: [BusinessController],
  providers: [BusinessService],
})
export class BusinessModule {}
