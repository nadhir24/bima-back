// src/cart/dto/update-cart.dto.ts

import { IsInt, IsOptional } from 'class-validator';

export class UpdateCartDto {
  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsInt()
  catalogId?: number;

  @IsOptional()
  @IsInt()
  sizeId?: number; // Add sizeId here

  @IsOptional()
  @IsInt()
  quantity?: number;
}
