import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  // @IsNotEmpty()
  // @IsString()
  name: string;

  // @IsNotEmpty()
  // @IsEmail()
  email: string;

  // @IsNotEmpty()
  // @IsString()
  // @MinLength(6, { message: 'Password must be at least 6 characters long' })
  // @MaxLength(9, { message: 'Password cannot be longer than 8 characters' })
  password: string;
}