import { IsNumber, IsNotEmpty } from "class-validator";

export class CreateCartDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsNumber()
  @IsNotEmpty()
  catalogId: number;

  @IsNumber()
  @IsNotEmpty()
  sizeId: number;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}