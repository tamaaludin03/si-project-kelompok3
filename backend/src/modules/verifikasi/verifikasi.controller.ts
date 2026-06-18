import { Controller, Get, Param } from "@nestjs/common";
import { VerifikasiService } from "./verifikasi.service";

@Controller("verifikasi")
export class VerifikasiController {
  constructor(private readonly verifikasiService: VerifikasiService) {}

  @Get(":kode")
  verify(@Param("kode") kode: string) {
    return this.verifikasiService.verify(kode);
  }
}