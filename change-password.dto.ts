import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]+$/, { message: 'NIP hanya boleh angka' })
  nip: string;

  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password baru minimal 8 karakter' })
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}