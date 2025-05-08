import { IsNumber, IsNotEmpty, ValidateIf } from 'class-validator';

export class CreateCartDto {
  @IsNumber()
  @IsNotEmpty()
  @ValidateIf((o) => !o.guestId, {
    message: 'userId must be provided when guestId is not present',
  })
  userId: number;


  @ValidateIf((o) => !o.userId, {
    message: 'guestId must be provided when userId is not present',
  })
  guestId?: string;

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
