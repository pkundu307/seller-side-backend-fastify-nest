import { Module, ValidationPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { S3Service } from 'src/products/utils/s3Service';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AdminController],
  providers: [AdminService,S3Service,
      {
      provide: ValidationPipe,
      useValue: new ValidationPipe({
        transform: true, // This enables the @Transform decorator in the DTO
        whitelist: true, // Strips properties that do not have any decorators
      }),
    },
  ],
})
export class AdminModule {}
