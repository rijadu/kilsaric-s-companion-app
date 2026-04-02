import { IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class InventoryCountItemDto {
  @IsString()
  productId: string;

  @IsString()
  productName: string;

  @IsNumber()
  systemStock: number;

  @IsNumber()
  actualStock: number;

  @IsNumber()
  difference: number;
}

export class CreateInventoryCountDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryCountItemDto)
  items: InventoryCountItemDto[];
}
