export class CreateCatalogDto {
  name: string;
  category: string;
  qty: number;
  price: string; // Pastikan ini adalah string
  isEnabled?: boolean;
  image?: string;
}
