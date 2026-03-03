import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class ParseBigIntPipe implements PipeTransform<string, bigint> {
  transform(value: string): bigint {
    if (!value || !/^\d+$/.test(value)) {
      throw new BadRequestException(
        `"${value}" is not a valid numeric ID`,
      );
    }
    return BigInt(value);
  }
}
