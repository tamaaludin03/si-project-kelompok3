export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export type LoginResponse = {
  message: string;
  nip: string;
  nama: string;
  jabatan: string;
  role: string;
};

export async function loginRequest(
  loginId: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nip: loginId, password }),
  });

  if (!res.ok) {
    let message = "NIP atau password salah.";
    try {
      const body = await res.json();
      if (body?.message) {
        if (Array.isArray(body.message)) {
          message = body.message[0];
        } else {
          message = body.message;
        }
      }
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  return res.json();
}

export async function terbitkanSuratCutiRequest(
  cutiId: number,
  nip: string,
  nomorSurat?: string,
) {
  const res = await fetch(`${API_BASE_URL}/cuti/${cutiId}/terbitkan-surat`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nip,
      nomor_surat: nomorSurat?.trim() || undefined,
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "Gagal menerbitkan surat cuti.");
  }

  return data;
}

export function getSuratCutiPdfUrl(cutiId: number) {
  return `${API_BASE_URL}/cuti/${cutiId}/pdf`;
}
