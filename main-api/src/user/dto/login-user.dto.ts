// src/user/dto/login-user.dto.ts
import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDto {
  @ApiProperty({
    description: 'The email address of the user. Must be unique.',
    example: 'abc@example.com',
  })
  @IsEmail()
  email: string;
    
  @ApiProperty({
    example:"123456789"
  })
  @IsNotEmpty()
  password: string;
}
