import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  ParseIntPipe,
  ForbiddenException,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Query,
} from "@nestjs/common";
import { Res } from "@nestjs/common";
import { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { mkdirSync } from "fs";

import { CutiService } from "./cuti.service";
import { CreateCutiDto } from "./dto/create-cuti.dto";
import { RoleService } from "../auth/role.service";

const uploadPath = "./uploads/lampiran";

@Controller("cuti")
export class CutiController {
  constructor(
    private readonly cutiService: CutiService,
    private readonly roleService: RoleService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor("lampiran", {
      storage: diskStorage({
        destination: (req, file, cb) => {
          mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException("File lampiran harus PDF, JPG, atau PNG"), false);
        }
        cb(null, true);
      },
    }),
  )
  create(@Body() dto: CreateCutiDto, @UploadedFile() file?: Express.Multer.File) {
    return this.cutiService.create(dto, file);
  }

  @Get("sisa-cuti/:nip")
  getSisaCuti(@Param("nip") nip: string) {
    return this.cutiService.getSisaCutiByNip(nip);
  }

  @Get("haid-status/:nip")
  getHaidStatusBulanIni(@Param("nip") nip: string) {
    return this.cutiService.getHaidStatusBulanIni(nip);
  }

  @Get("mine/:nip")
  findMine(@Param("nip") nip: string) {
    return this.cutiService.findMine(nip);
  }

  @Get("kaur/pending")
  getPendingForKaur(@Query("nip") nip?: string) {
    return this.cutiService.findPendingForKaur(nip);
  }

  @Get("kabag/pending")
  getPendingForKabag(@Query("nip") nip?: string) {
    return this.cutiService.findPendingForKabag(nip);
  }

  @Get("direktur/pending")
  getPendingForDirektur(@Query("nip") nip?: string) {
    return this.cutiService.findPendingForDirektur(nip);
  }

  @Get("direktur/stats")
  getDirekturStats(@Query("nip") nip?: string) {
    return this.cutiService.getDirekturStats(nip);
  }

  @Get("sdm/monitoring")
  getMonitoringForSdm() {
    return this.cutiService.findMonitoringForSdm();
  }

  @Get("sdm/sisa-cuti-semua")
  getSisaCutiSemua() {
    return this.cutiService.getSisaCutiSemuaPegawai();
  }

  @Get("admin/all-pengajuan")
  getAllPengajuanForAdmin() {
    return this.cutiService.findAllPengajuanForAdmin();
  }

  @Patch(":id/approve-kaur")
  async approveByKaur(
    @Param("id", ParseIntPipe) id: number,
    @Body("nip") nip: string,
    @Body("catatan") catatan?: string,
  ) {
    if (!nip) throw new ForbiddenException("NIP wajib dikirim untuk approval");
    await this.roleService.assertRole(nip, ["kaur", "admin"]);
    return this.cutiService.approveByKaur(id, nip, catatan);
  }

  @Patch(":id/reject-kaur")
  async rejectByKaur(
    @Param("id", ParseIntPipe) id: number,
    @Body("nip") nip: string,
    @Body("alasan") alasan: string,
  ) {
    if (!nip) throw new ForbiddenException("NIP wajib dikirim untuk approval");
    await this.roleService.assertRole(nip, ["kaur", "admin"]);
    return this.cutiService.rejectByKaur(id, nip, alasan);
  }

  @Patch(":id/approve-kabag")
  async approveByKabag(
    @Param("id", ParseIntPipe) id: number,
    @Body("nip") nip: string,
    @Body("catatan") catatan?: string,
  ) {
    if (!nip) throw new ForbiddenException("NIP wajib dikirim untuk approval");
    await this.roleService.assertRole(nip, ["kabag", "admin"]);
    return this.cutiService.approveByKabag(id, nip, catatan);
  }

  @Patch(":id/reject-kabag")
  async rejectByKabag(
    @Param("id", ParseIntPipe) id: number,
    @Body("nip") nip: string,
    @Body("alasan") alasan: string,
  ) {
    if (!nip) throw new ForbiddenException("NIP wajib dikirim untuk approval");
    await this.roleService.assertRole(nip, ["kabag", "admin"]);
    return this.cutiService.rejectByKabag(id, nip, alasan);
  }

  @Get("direksi/pending")
  getPendingForDireksi() {
    return this.cutiService.findPendingForDireksi();
  }

  @Patch(":id/approve-direksi")
  async approveByDireksi(
    @Param("id", ParseIntPipe) id: number,
    @Body("nip") nip: string,
    @Body("catatan") catatan?: string,
  ) {
    if (!nip) throw new ForbiddenException("NIP wajib dikirim untuk approval");
    await this.roleService.assertRole(nip, ["direksi", "admin"]);
    return this.cutiService.approveByDireksi(id, nip, catatan);
  }

  @Patch(":id/reject-direksi")
  async rejectByDireksi(
    @Param("id", ParseIntPipe) id: number,
    @Body("nip") nip: string,
    @Body("alasan") alasan: string,
  ) {
    if (!nip) throw new ForbiddenException("NIP wajib dikirim untuk approval");
    await this.roleService.assertRole(nip, ["direksi", "admin"]);
    return this.cutiService.rejectByDireksi(id, nip, alasan);
  }

  @Patch(":id/approve-direktur")
  async approveByDirektur(
    @Param("id", ParseIntPipe) id: number,
    @Body("nip") nip: string,
    @Body("catatan") catatan?: string,
  ) {
    if (!nip) throw new ForbiddenException("NIP wajib dikirim untuk approval");
    await this.roleService.assertRole(nip, ["direktur", "admin"]);
    return this.cutiService.approveByDirektur(id, nip, catatan);
  }

  @Patch(":id/reject-direktur")
  async rejectByDirektur(
    @Param("id", ParseIntPipe) id: number,
    @Body("nip") nip: string,
    @Body("alasan") alasan: string,
  ) {
    if (!nip) throw new ForbiddenException("NIP wajib dikirim untuk approval");
    await this.roleService.assertRole(nip, ["direktur", "admin"]);
    return this.cutiService.rejectByDirektur(id, nip, alasan);
  }

  @Patch(":id/terbitkan-surat")
  async terbitkanSuratCuti(
    @Param("id", ParseIntPipe) id: number,
    @Body("nip") nip: string,
    @Body("nomor_surat") nomorSurat?: string,
  ) {
    if (!nip) throw new ForbiddenException("NIP SDM wajib dikirim untuk menerbitkan surat");
    await this.roleService.assertRole(nip, ["sdm", "admin"]);
    return this.cutiService.terbitkanSuratCuti(id, nip, nomorSurat);
  }

  @Patch("admin/reset-kuota-tahunan")
  async resetKuotaTahunan(
    @Body("nip_admin") nipAdmin: string,
    @Body("nip_pegawai") nipPegawai?: string,
    @Body("tahun") tahun?: number,
  ) {
    if (!nipAdmin) throw new ForbiddenException("NIP admin wajib dikirim");
    await this.roleService.assertRole(nipAdmin, ["admin"]);
    return this.cutiService.resetKuotaTahunan(nipAdmin, nipPegawai, tahun);
  }

  @Get(":id/pdf")
  async downloadCutiPdf(@Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    const buffer = await this.cutiService.generateCutiPdf(id);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="surat-cuti-${id}.pdf"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }
}
