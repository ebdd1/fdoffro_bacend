import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsIn } from 'class-validator';

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
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(72)
  password: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['seeker', 'owner'])
  role: 'seeker' | 'owner';

  @IsString()
  phone: string;
}
