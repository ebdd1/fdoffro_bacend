import { IsString, IsNotEmpty } from 'class-validator';

export class SubmitPaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentProofUrl: string;
}
