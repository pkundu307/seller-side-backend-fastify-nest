import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('profile')
export class ProfileController {
  @UseGuards(AuthGuard('jwt'))
  @Get()
  getProfile(@Req() req: Request) {
    return {
      message: 'Protected route 🛡️',
      user: req.user, // <-- user info from JWT
    };
  }
}
