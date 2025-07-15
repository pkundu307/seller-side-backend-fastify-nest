import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'The email address of the user. Must be unique.',
    example: 'jane.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'The password for the user. Minimum 8 characters.',
    example: 'S3cureP@ssword!',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'The full name of the user (optional).',
    example: 'Jane Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  // Note: We do not include 'role' here. It's a security risk to let users
  // set their own role during registration. We will rely on the Prisma
  // schema's default value ('user').
}