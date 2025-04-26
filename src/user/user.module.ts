import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller'; // Add this import

@Module({
  controllers: [UserController], // Add this line
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}