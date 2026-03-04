import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VoteInsightDto {
  @ApiProperty({ description: 'Vote value (1 for upvote, -1 for downvote)' })
  @IsNumber()
  @Min(-1)
  @Max(1)
  vote!: number;
}
