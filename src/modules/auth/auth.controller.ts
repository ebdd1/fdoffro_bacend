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
    // SameSite=none allows the cookie to be sent cross-origin (Vercel → Railway) [F-002]
    // Secure (HTTPS) is enforced by Railway
    res.cookie('auth_token', token, {
      httpOnly: true,   // Not accessible to JavaScript [F-002]
      secure: true,     // HTTPS only
      sameSite: 'none', // Required for cross-origin cookie [F-002]
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(registerDto);
    // Set httpOnly cookie alongside the token in the response body [F-002]
    this.setAuthCookie(res, result.access_token);
    // Remove token from body — cookie already carries it
    const { access_token: _token, ...userOnly } = result;
    return { user: userOnly };
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto);
    // Set httpOnly cookie alongside the token in the response body [F-002]
    this.setAuthCookie(res, result.access_token);
    // Keep body compatible with existing frontend (still returns token for dev)
    return result;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    // Clear httpOnly cookie [F-009]
    res.clearCookie('auth_token', { httpOnly: true, secure: true, sameSite: 'none', path: '/' });
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
