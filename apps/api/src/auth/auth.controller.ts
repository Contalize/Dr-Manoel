import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { LoginDto, RegisterTenantDto } from '@dr-manoel/shared';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterTenantDto) {
    return this.authService.register(registerDto);
  }
}
