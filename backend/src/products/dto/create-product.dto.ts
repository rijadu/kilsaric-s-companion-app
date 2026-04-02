import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class VariantDto {
  @IsString()
  name: string;

  @IsString()
  sku: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsNumber()
  priceOverride?: number;
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  sku: string;

  @IsString()
  barcode: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsString()
  brand: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  costPrice: number;

  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @IsOptional()
  @IsNumber()
  bulkPrice?: number;

  @IsOptional()
  @IsNumber()
  bulkMinQty?: number;

  @IsEnum(['piece', 'kg', 'meter', 'liter', 'box'])
  unit: 'piece' | 'kg' | 'meter' | 'liter' | 'box';

  @IsOptional()
  @IsNumber()
  packSize?: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsNumber()
  @Min(0)
  lowStockThreshold: number;

  @IsEnum(['active', 'inactive'])
  status: 'active' | 'inactive';

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @IsNumber()
  warrantyMonths?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];
}
