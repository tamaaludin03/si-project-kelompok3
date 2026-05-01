import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCutiDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['tahunan', 'melahirkan', 'menikah'])
  jenis_cuti!: string;

  @IsDateString()
  tanggal_mulai!: string;

  @IsDateString()
  tanggal_selesai!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  alasan!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  pegawai_pengganti_id!: number;
}