import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';

/**
 * Cursor-based pagination for message fetching.
 *
 * Why cursor-based over offset-based:
 * - Stable: adding new messages doesn't shift existing page boundaries
 * - Performant: O(1) seek vs O(n) skip on large tables
 * - Predictable: "give me 50 messages after message X" semantics
 */
export class QueryMessagesDto {
  @IsOptional()
  @IsString()
  cursor?: string; // Message ID to seek from

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100) // Cap at 100 to prevent abuse
  limit?: number = 50; // Default 50, max 100

  @IsOptional()
  direction?: 'before' | 'after' = 'after'; // For loading older vs newer messages
}
