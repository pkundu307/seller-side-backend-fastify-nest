import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

export const RABBITMQ_SERVICE = 'RABBITMQ_SERVICE';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: RABBITMQ_SERVICE,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')||'amqp://localhost:5672'],
            queue: 'notifications_queue', // A default queue, can be overridden
            queueOptions: {
              durable: true, // Queue will survive broker restarts
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  exports: [ClientsModule], // Export the ClientsModule to make the client available for injection
})
export class RabbitMQModule {}