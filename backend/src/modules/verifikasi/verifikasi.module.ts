import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { VerifikasiController } from "./verifikasi.controller";
import { VerifikasiService } from "./verifikasi.service";

@Module({
  controllers: [VerifikasiController],
  providers: [VerifikasiService, PrismaService],
})
export class VerifikasiModule {}