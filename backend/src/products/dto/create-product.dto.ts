import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';

export class CreateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @IsOptional()
  @IsNumber()
  bulkPrice?: number;

  @IsOptional()
  @IsNumber()
  bulkMinQty?: number;

  @IsOptional()
  @IsEnum(['piece', 'kg', 'meter', 'liter', 'box'])
  unit?: 'piece' | 'kg' | 'meter' | 'liter' | 'box';

  @IsOptional()
  @IsNumber()
  packSize?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @IsNumber()
  warrantyMonths?: number;
}
