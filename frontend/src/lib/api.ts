const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export interface AuthResponse {
  ok: boolean;
  token?: string;
}

export const register = async (payload: { email: string; password: string; name?: string }) => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const login = async (payload: { email: string; password: string }) => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const me = async (token: string) => {
  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};
