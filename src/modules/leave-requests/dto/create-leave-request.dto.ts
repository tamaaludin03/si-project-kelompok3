import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]+$/, { message: 'NIP hanya boleh angka' })
  nip: string;

  @IsString()
  @IsNotEmpty()
  jenis_cuti: string;

  @IsString()
  @IsNotEmpty()
  tanggal_mulai: string;

  @IsString()
  @IsNotEmpty()
  tanggal_selesai: string;

  @IsString()
  @IsNotEmpty()
  alasan: string;
}