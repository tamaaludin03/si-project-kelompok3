"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePermissionRequestDto = void 0;
const class_validator_1 = require("class-validator");
class CreatePermissionRequestDto {
}
exports.CreatePermissionRequestDto = CreatePermissionRequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePermissionRequestDto.prototype, "nip", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsIn)([
        'Izin Terlambat Bekerja',
        'Izin Tidak Masuk Kerja',
        'Izin Tidak Mengikuti Apel',
        'Izin Pulang Sebelum Waktu',
    ]),
    __metadata("design:type", String)
], CreatePermissionRequestDto.prototype, "jenis_izin", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'tanggal harus berformat YYYY-MM-DD',
    }),
    __metadata("design:type", String)
], CreatePermissionRequestDto.prototype, "tanggal", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{2}:\d{2}$/, {
        message: 'jam_mulai harus berformat HH:MM',
    }),
    __metadata("design:type", String)
], CreatePermissionRequestDto.prototype, "jam_mulai", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{2}:\d{2}$/, {
        message: 'jam_selesai harus berformat HH:MM',
    }),
    __metadata("design:type", String)
], CreatePermissionRequestDto.prototype, "jam_selesai", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreatePermissionRequestDto.prototype, "alasan", void 0);
//# sourceMappingURL=create-permission-request.dto.js.map