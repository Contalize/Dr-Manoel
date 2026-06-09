import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is missing');
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is missing. Refusing to start.');
}

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET as string, // SECURITY: Fail-fast without fallback
      secret: jwtSecret as string,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
