import { IsString, IsNumber } from 'class-validator';

export class StockCorrectionDto {
  @IsString()
  productId: string;

  @IsNumber()
  quantity: number;

  @IsString()
  note: string;
}
