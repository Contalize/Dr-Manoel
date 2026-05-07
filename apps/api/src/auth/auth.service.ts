import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterTenantDto } from '@dr-manoel/shared';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      loginDto.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = { sub: user.id, tenantId: user.tenantId, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  async register(registerDto: RegisterTenantDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('E-mail já está em uso.');
    }

    const hashedPassword = await argon2.hash(registerDto.passwordHash);

    const result = await this.prisma.$transaction(async (prisma) => {
      const tenant = await prisma.tenant.create({
        data: {
          name: registerDto.tenantName,
          document: registerDto.document,
        },
      });

      const user = await prisma.user.create({
        data: {
          email: registerDto.email,
          passwordHash: hashedPassword,
          role: 'ADMIN',
          tenantId: tenant.id,
        },
      });

      return { tenant, user };
    });

    return result;
  }
}
