const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

const getToken = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("paperworkiq_token");
};

export const signOut = async () => {
  const token = getToken();
  try {
    await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch (error) {
    console.error("Unable to sign out:", error);
  } finally {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("paperworkiq_token");
    }
  }
};
