import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateCartDto {
  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsInt()
  catalogId?: number;

  @IsOptional()
  @IsInt()
  sizeId?: number;

  @IsOptional()
  @Transform(({ value }) => {
    const val = Number(value);
    if (isNaN(val)) {
      console.error('Invalid quantity:', value);
      throw new Error('quantity must be a valid number');
    }
    return val;
  })
  @IsInt()
  @IsNotEmpty()
  quantity?: number;
}
