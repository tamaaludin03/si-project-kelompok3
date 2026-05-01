import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateIzinDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['terlambat', 'tidak_masuk', 'tidak_apel', 'pulang_awal'])
  jenis_izin!: string;

  @IsDateString()
  tanggal_izin!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  alasan!: string;
}