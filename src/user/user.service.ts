import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto'; // <-- 1. IMPORT THIS
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,

  ) {}

  async create(createUserDto: CreateUserDto) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);
    console.log(createUserDto);
    
    try {
            const user = await this.prisma.user.create({
  data: {
    // id: randomUUID(), // only if using id: String
    email: createUserDto.email,
    name: createUserDto.name,
    password: hashedPassword,
  },
  select: {
    // id: true,
    email: true,
    name: true,
    role: true,
    createdAt: true,
  },
});


      return user;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `User with email "${createUserDto.email}" already exists.`,
        );
      }
      
      // Log the specific error for better debugging
      console.error('Failed to create user:', error);
      throw new InternalServerErrorException('Could not create user.');
    }
  }

  // Your existing loginUser function remains the same
 async loginUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async getUserProfile(userId: string) {
  try {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) throw new Error('User not found');
    return user;
  } catch (error) {
    throw new Error('Failed to fetch user profile');
  }
}

}
