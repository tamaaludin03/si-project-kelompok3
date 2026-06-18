import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from "class-validator";

export class CreateLeaveRequestDto {
  @IsString()
  @IsNotEmpty()
  nip: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(["tahunan", "besar", "haid", "menikah", "melahirkan"], {
    message: "jenis_cuti tidak valid. Pilih: tahunan, besar, haid, menikah, melahirkan",
  })
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

  @IsOptional()
  @IsString()
  tujuan_cuti?: string;

  @IsOptional()
  @IsString()
  alamat_selama_cuti?: string;

  @IsOptional()
  @IsString()
  no_hp_selama_cuti?: string;

  @IsOptional()
  @IsString()
  tanggal_kembali?: string;

  @IsOptional()
  @IsString()
  penyerahan_tugas_kepada?: string;

  @IsOptional()
  @IsString()
  jabatan_pengganti?: string;

  @IsOptional()
  @IsString()
  catatan_pegawai?: string;
}