// src/cart/dto/create-cart.dto.ts

import { IsInt, IsNotEmpty } from 'class-validator';

export class CreateCartDto {
  @IsInt()
  userId: number;

  @IsInt()
  catalogId: number;

  @IsInt()
  sizeId: number; // Add sizeId here

  @IsInt()
  @IsNotEmpty()
  quantity: number;
}
