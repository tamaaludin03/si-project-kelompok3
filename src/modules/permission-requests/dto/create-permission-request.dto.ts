import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreatePermissionRequestDto {
  @IsString()
  @IsNotEmpty()
  nip: string;

  @IsString()
  @IsNotEmpty()
  @IsIn([
    'Izin Terlambat Bekerja',
    'Izin Tidak Masuk Kerja',
    'Izin Tidak Mengikuti Apel',
    'Izin Pulang Sebelum Waktu',
  ])
  jenis_izin: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'tanggal harus berformat YYYY-MM-DD',
  })
  tanggal: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'jam_mulai harus berformat HH:MM',
  })
  jam_mulai?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'jam_selesai harus berformat HH:MM',
  })
  jam_selesai?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  alasan: string;
}