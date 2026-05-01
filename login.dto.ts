import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]+$/, { message: 'NIP hanya boleh angka' })
  nip: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}