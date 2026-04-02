import { IsString } from 'class-validator';

export class RefundSaleDto {
  @IsString()
  reason: string;
}
