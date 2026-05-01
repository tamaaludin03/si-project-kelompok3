-- CreateTable
CREATE TABLE "pegawai" (
    "id" SERIAL NOT NULL,
    "nip" VARCHAR(50) NOT NULL,
    "username" TEXT,
    "nama" TEXT,
    "jabatan" TEXT,
    "password" TEXT,
    "must_change_password" BOOLEAN DEFAULT true,
    "role" VARCHAR(20) DEFAULT 'pegawai',
    "tanggal_lahir" DATE,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pegawai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuti" (
    "id" SERIAL NOT NULL,
    "pegawai_id" INTEGER NOT NULL,
    "jenis_cuti" VARCHAR(50) NOT NULL,
    "tanggal_mulai" DATE NOT NULL,
    "tanggal_selesai" DATE NOT NULL,
    "alasan" TEXT,
    "status" VARCHAR(20) DEFAULT 'pending',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "izin" (
    "id" SERIAL NOT NULL,
    "pegawai_id" INTEGER NOT NULL,
    "jenis_izin" VARCHAR(50) NOT NULL,
    "tanggal" DATE NOT NULL,
    "jam_mulai" VARCHAR(10),
    "jam_selesai" VARCHAR(10),
    "alasan" TEXT,
    "status" VARCHAR(20) DEFAULT 'pending',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "izin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pegawai_nip_key" ON "pegawai"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "pegawai_username_key" ON "pegawai"("username");

-- AddForeignKey
ALTER TABLE "cuti" ADD CONSTRAINT "cuti_pegawai_id_fkey" FOREIGN KEY ("pegawai_id") REFERENCES "pegawai"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "izin" ADD CONSTRAINT "izin_pegawai_id_fkey" FOREIGN KEY ("pegawai_id") REFERENCES "pegawai"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

