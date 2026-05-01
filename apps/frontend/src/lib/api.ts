

export const API_BASE_URL = "http://localhost:3001"; 


export type LoginResponse = {
  message: string;
  nip: string;
  nama: string;
  jabatan: string;
  role: string;
};

export async function loginRequest(
  loginId: string,
  password: string
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
      // biarkan message default
    }
    throw new Error(message);
  }

  return res.json();
}