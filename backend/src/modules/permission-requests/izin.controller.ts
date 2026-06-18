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

import { IzinService } from "./izin.service";
import { CreateIzinDto } from "./dto/create-izin.dto";
import { RoleService } from "../auth/role.service";

const uploadPath = "./uploads/lampiran";

@Controller("izin")
export class IzinController {
  constructor(
    private readonly izinService: IzinService,
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
  create(@Body() dto: CreateIzinDto, @UploadedFile() file?: Express.Multer.File) {
    return this.izinService.create(dto, file);
  }

  @Get("mine/:nip")
  findMine(@Param("nip") nip: string) {
    return this.izinService.findMine(nip);
  }

  @Get("kaur/pending")
  getPendingForKaur(@Query("nip") nip?: string) {
    return this.izinService.findPendingForKaur(nip);
  }

  @Get("kabag/pending")
  getPendingForKabag(@Query("nip") nip?: string) {
    return this.izinService.findPendingForKabag(nip);
  }

  @Get("direktur/pending")
  getPendingForDirektur(@Query("nip") nip?: string) {
    return this.izinService.findPendingForDirektur(nip);
  }

  @Get("sdm/monitoring")
  getMonitoringForSdm() {
    return this.izinService.findMonitoringForSdm();
  }

  @Patch(":id/approve-kaur")
  async approveByKaur(
    @Param("id", ParseIntPipe) id: number,
    @Body("nip") nip: string,
    @Body("catatan") catatan?: string,
  ) {
    if (!nip) throw new ForbiddenException("NIP wajib dikirim untuk approval");
    await this.roleService.assertRole(nip, ["kaur", "admin"]);
    return this.izinService.approveByKaur(id, nip, catatan);
  }

  @Patch(":id/reject-kaur")
  async rejectByKaur(
    @Param("id", ParseIntPipe) id: number,
    @Body("nip") nip: string,
    @Body("alasan") alasan: string,
  ) {
    if (!nip) throw new ForbiddenException("NIP wajib dikirim untuk approval");
    await this.roleService.assertRole(nip, ["kaur", "admin"]);
    return this.izinService.rejectByKaur(id, nip, alasan);
  }

  @Patch(":id/approve-kabag")
  async approveByKabag(
    @Param("id", ParseIntPipe) id: number,
    @Body("nip") nip: string,
    @Body("catatan") catatan?: string,
  ) {
    if (!nip) throw new ForbiddenException("NIP wajib dikirim untuk approval");
    await this.roleService.assertRole(nip, ["kabag", "admin"]);
    return this.izinService.approveByKabag(id, nip, catatan);
  }

  @Patch(":id/reject-kabag")
  async rejectByKabag(
    @Param("id", ParseIntPipe) id: number,
    @Body("nip") nip: string,
    @Body("alasan") alasan: string,
  ) {
    if (!nip) throw new ForbiddenException("NIP wajib dikirim untuk approval");
    await this.roleService.assertRole(nip, ["kabag", "admin"]);
    return this.izinService.rejectByKabag(id, nip, alasan);
  }

  @Get("direksi/pending")
  getPendingForDireksi() {
    return this.izinService.findPendingForDireksi();
  }

  @Patch(":id/approve-direksi")
  async approveByDireksi(
    @Param("id", ParseIntPipe) id: number,
    @Body("nip") nip: string,
    @Body("catatan") catatan?: string,
  ) {
    if (!nip) throw new ForbiddenException("NIP wajib dikirim untuk approval");
    await this.roleService.assertRole(nip, ["direksi", "admin"]);
    return this.izinService.approveByDireksi(id, nip, catatan);
  }

  @Patch(":id/reject-direksi")
  async rejectByDireksi(
    @Param("id", ParseIntPipe) id: number,
    @Body("nip") nip: string,
    @Body("alasan") alasan: string,
  ) {
    if (!nip) throw new ForbiddenException("NIP wajib dikirim untuk approval");
    await this.roleService.assertRole(nip, ["direksi", "admin"]);
    return this.izinService.rejectByDireksi(id, nip, alasan);
  }

  @Patch(":id/approve-direktur")
  async approveByDirektur(
    @Param("id", ParseIntPipe) id: number,
    @Body("nip") nip: string,
    @Body("catatan") catatan?: string,
  ) {
    if (!nip) throw new ForbiddenException("NIP wajib dikirim untuk approval");
    await this.roleService.assertRole(nip, ["direktur", "admin"]);
    return this.izinService.approveByDirektur(id, nip, catatan);
  }

  @Patch(":id/reject-direktur")
  async rejectByDirektur(
    @Param("id", ParseIntPipe) id: number,
    @Body("nip") nip: string,
    @Body("alasan") alasan: string,
  ) {
    if (!nip) throw new ForbiddenException("NIP wajib dikirim untuk approval");
    await this.roleService.assertRole(nip, ["direktur", "admin"]);
    return this.izinService.rejectByDirektur(id, nip, alasan);
  }

  @Get(":id/pdf")
  async downloadIzinPdf(@Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    const buffer = await this.izinService.generateIzinPdf(id);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="surat-izin-${id}.pdf"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }
}
