import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(100)
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(72)
  @Matches(/[A-Z]/, { message: 'Password harus mengandung minimal 1 huruf kapital' })
  @Matches(/[0-9]/, { message: 'Password harus mengandung minimal 1 angka' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password harus mengandung minimal 1 karakter spesial (!@#$%)' })
  password: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(seeker|owner)$/, { message: 'Role harus seeker atau owner' })
  role: 'seeker' | 'owner';

  @IsString()
  phone: string;
}
