import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";

import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import * as path from "path";

import { EmployeesService } from "./employees.service";

@Controller("pegawai")
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  // =========================
  // PROFILE PEGAWAI
  // =========================

  @Get("list")
  async getPegawaiList(
    @Query("unit") unit?: string,
    @Query("excludeNip") excludeNip?: string,
  ) {
    return this.employeesService.getPegawaiListPublic(unit, excludeNip);
  }

  @Get("me/:nip")
  async getProfile(@Param("nip") nip: string) {
    return this.employeesService.getProfileByNip(nip);
  }

  @Put("me/:nip")
  async updateProfile(
    @Param("nip") nip: string,
    @Body()
    body: {
      email?: string;
      no_hp?: string;

      is_nakes?: boolean;

      nomor_str?: string;
      str_seumur_hidup?: boolean;

      nomor_sip?: string;
      tanggal_terbit_sip?: string;
      expired_sip?: string;
    },
  ) {
    return this.employeesService.updateProfileByNip(nip, body);
  }

  @Post("upload-signature/:nip")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads/signatures",

        filename: (req, file, cb) => {
          const nip = req.params.nip;
          const ext = path.extname(file.originalname).toLowerCase();

          cb(null, `${nip}-signature${ext}`);
        },
      }),

      fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];

        if (!allowedTypes.includes(file.mimetype)) {
          return cb(
            new Error("File tanda tangan harus PNG/JPG/JPEG"),
            false,
          );
        }

        cb(null, true);
      },

      limits: {
        fileSize: 2 * 1024 * 1024,
      },
    }),
  )
  async uploadSignature(
    @Param("nip") nip: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.employeesService.uploadSignature(nip, file);
  }

  // =========================
  // SDM NAKES MONITORING
  // =========================

  @Get("sdm/nakes-monitoring")
  async getNakesMonitoring() {
    return this.employeesService.getNakesMonitoring();
  }

  // =========================
  // ADMIN MANAGEMENT
  // =========================

  @Get("admin/list")
  async getAdminPegawaiList() {
    return this.employeesService.getAdminPegawaiList();
  }

  @Patch("admin/:id")
  async adminUpdatePegawai(
    @Param("id", ParseIntPipe) id: number,
    @Body()
    body: {
      username?: string;

      nip?: string | null;
      nama?: string | null;
      jabatan?: string | null;
      jenis_pegawai?: string | null;

      email?: string | null;
      no_hp?: string | null;

      role?: string;
      internal_role?: string | null;

      portal_pegawai_access?: boolean;
      must_change_password?: boolean;

      is_nakes?: boolean;
    },
  ) {
    return this.employeesService.adminUpdatePegawai(id, body);
  }

  @Patch("admin/:id/reset-password")
  async adminResetPassword(@Param("id", ParseIntPipe) id: number) {
    return this.employeesService.adminResetPassword(id);
  }
}
