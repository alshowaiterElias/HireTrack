import {
  Controller, Post, Get, Patch, Delete, Body,
  UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IsEmail, IsString, IsOptional, Length, MinLength, IsBoolean } from 'class-validator';

// ─── DTOs ────────────────────────────────────────────────────

class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsOptional()
  name?: string;
}

class EmailLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

class OAuthLoginDto {
  @IsEmail()
  email!: string;

  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() avatarUrl?: string;
  @IsString() provider!: string;
  @IsString() providerId!: string;
}

class SendCodeDto {
  @IsEmail()
  email!: string;
}

class VerifyCodeDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}

class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

class ResetPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  code!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

class UpdateProfileDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() timezone?: string;
  @IsBoolean() @IsOptional() digestEnabled?: boolean;
}

// ─── Controller ──────────────────────────────────────────────

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.name);
  }

  @Post('email-login')
  @HttpCode(HttpStatus.OK)
  async emailLogin(@Body() dto: EmailLoginDto) {
    return this.authService.emailLogin(dto.email, dto.password);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async oauthLogin(@Body() dto: OAuthLoginDto) {
    const user = await this.authService.validateOAuthUser({
      email: dto.email, name: dto.name, avatarUrl: dto.avatarUrl,
      provider: dto.provider, providerId: dto.providerId,
    });
    const tokens = await this.authService.generateTokens(user.id, user.email);
    return {
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
      ...tokens,
    };
  }

  @Post('send-code')
  @HttpCode(HttpStatus.OK)
  async sendCode(@Body() dto: SendCodeDto) {
    return this.authService.sendVerificationCode(dto.email);
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  async verifyCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto.email, dto.code);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.sendPasswordReset(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.code, dto.newPassword);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.sub);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Body() dto: UpdateProfileDto, @Req() req: any) {
    return this.authService.updateProfile(req.user.sub, dto);
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@Req() req: any) {
    return this.authService.deleteAccount(req.user.sub);
  }
}
