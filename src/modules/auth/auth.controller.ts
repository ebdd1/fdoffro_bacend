import { Controller, Post, Patch, Body, Get, UseGuards, Request, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

// Fields user is NEVER allowed to change — prevents privilege escalation [F-004, F-015]
const ALLOWED_UPDATE_FIELDS = [
  'name', 'phone', 'avatar_url', 'banner_url',
  'bankName', 'bankAccountNumber', 'bankAccountHolder',
];

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookie(res: Response, token: string) {
    // httpOnly cookie for same-origin requests (dev/Railway-to-Railway).
    // For cross-origin (Vercel → Railway), frontend uses Bearer token in Authorization header instead.
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(registerDto);
    // Set cookie for same-origin; return token in body for cross-origin Bearer auth
    this.setAuthCookie(res, result.access_token);
    return result; // { access_token, user }
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto);
    this.setAuthCookie(res, result.access_token);
    return result; // { access_token, user }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('auth_token', { httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
    await this.authService.logout(req.user.id, req.user.jti);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req: any) {
    return req.user;
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@Request() req: any, @Body() dto: UpdateProfileDto) {
    // Strip privileged fields — even if attacker sends them via direct API call [F-004, F-015]
    const safeData: Partial<UpdateProfileDto> = {};
    for (const key of ALLOWED_UPDATE_FIELDS) {
      if ((dto as any)[key] !== undefined) {
        (safeData as any)[key] = (dto as any)[key];
      }
    }
    return this.authService.updateProfile(req.user.id, safeData);
  }
}
