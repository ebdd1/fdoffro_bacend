import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

// seekerId is overridden server-side from JWT — not trusted from client [F-010]
export class CreateConversationDto {
  @IsOptional()
  @IsString()
  seekerId?: string;

  @IsString()
  @IsNotEmpty()
  ownerId: string;

  @IsString()
  @IsNotEmpty()
  propertyId: string;
}
