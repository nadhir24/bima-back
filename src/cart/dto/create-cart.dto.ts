import { IsNumber, IsNotEmpty, ValidateIf } from 'class-validator';

export class CreateCartDto {
  @IsNumber()
  @IsNotEmpty()
  @ValidateIf((o) => !o.guestID, { message: 'userId must be provided when guestID is not present' })
  userId: number;

  @IsNumber()
  @IsNotEmpty()
  @ValidateIf((o) => !o.userId, { message: 'guestID must be provided when userId is not present' })
  guestID: number;

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
