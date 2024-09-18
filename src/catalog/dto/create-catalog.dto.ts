export class CreateCatalogDto {
  name: string;
  category: string;
  size: string;
  qty: number;
  price: string; // Pastikan ini adalah string
  isEnabled?: boolean;
  image?: string;
}
