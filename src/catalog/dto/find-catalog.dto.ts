import { IsNotEmpty } from 'class-validator';

export class FindCatalogDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  category: string;
}
