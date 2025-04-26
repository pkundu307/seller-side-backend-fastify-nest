import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  password: string;
}
// src/user/dto/login-user.dto.ts

export class LoginUserDto {
    @ApiProperty()
    email: string;
  
    @ApiProperty()
    password: string;
}