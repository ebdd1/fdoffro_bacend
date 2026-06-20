import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name, role, phone } = registerDto;

    // Respect the admin "allow_registration" toggle (admins are never created
    // through public registration, so this safely gates seekers and owners).
    const regCfg = await this.prisma.siteConfig.findUnique({ where: { key: 'allow_registration' } });
    if (regCfg && regCfg.value === 'false') {
      throw new ForbiddenException('Pendaftaran akun baru sedang ditutup.');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password_hash: hashedPassword,
        name,
        role,
        phone,
      },
    });

    const payload = { sub: user.id, email: user.email, role: user.role, jti: randomUUID() };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
      }
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('Akun Anda telah dinonaktifkan.');
    }

    const payload = { sub: user.id, email: user.email, role: user.role, jti: randomUUID() };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
      }
    };
  }

  async updateProfile(
    userId: string,
    dto: {
      name?: string;
      phone?: string;
      avatar_url?: string;
      banner_url?: string;
      bankName?: string;
      bankAccountNumber?: string;
      bankAccountHolder?: string;
    },
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto, // dto is already sanitized by controller whitelist [F-004, F-015]
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      avatar_url: user.avatar_url,
      banner_url: user.banner_url,
      bankName: user.bankName,
      bankAccountNumber: user.bankAccountNumber,
      bankAccountHolder: user.bankAccountHolder,
    };
  }

  // Invalidate token on logout [F-009]
  // jti = JWT "JWT ID" claim for per-token blacklist
  private invalidatedTokens = new Set<string>();

  async logout(userId: string, jti?: string) {
    if (jti) this.invalidatedTokens.add(jti);
    return { message: 'Logged out successfully' };
  }

  // Check if a token has been invalidated (called by JWT strategy) [F-009]
  isTokenInvalidated(jti: string): boolean {
    return this.invalidatedTokens.has(jti);
  }

  async getMockMe() {
    // Keeping for backwards compatibility if needed during migration
    return this.prisma.user.findFirst({
      where: { email: 'john@example.com' },
    });
  }
}
