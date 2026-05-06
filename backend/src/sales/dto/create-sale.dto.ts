import { IsString, IsOptional, IsEnum, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SaleItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsEnum(['percent', 'fixed'])
  discountType?: 'percent' | 'fixed';

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;
}

export class CreateSaleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsOptional()
  @IsEnum(['percent', 'fixed'])
  discountType?: 'percent' | 'fixed';

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsEnum(['cash', 'card'])
  paymentMethod: 'cash' | 'card';

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;
}
