import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  @IsIn(['text', 'image', 'location'])
  contentType?: string;
}
