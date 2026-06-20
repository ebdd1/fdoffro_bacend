import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateMessageDto {
  // senderId is overridden server-side from JWT — not trusted from client [F-010]
  @IsOptional()
  @IsString()
  senderId?: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  @IsIn(['text', 'image', 'location'])
  contentType?: string;
}
