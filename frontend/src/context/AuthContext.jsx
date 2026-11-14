import { createContext, useContext, useState } from "react";
import api from "../services/api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("hi_user")); } catch { return null; } });
  async function requestOtp(payload) {
    const { data } = await api.post("/auth/request-otp", payload);
    return data;
  }
  async function verifyOtp(payload) {
    const { data } = await api.post("/auth/verify-otp", payload);
    localStorage.setItem("hi_token", data.token); localStorage.setItem("hi_user", JSON.stringify(data.user)); setUser(data.user);
    return data;
  }
  async function login(payload) {
    const { data } = await api.post("/auth/login", payload);
    localStorage.setItem("hi_token", data.token); localStorage.setItem("hi_user", JSON.stringify(data.user)); setUser(data.user);
    return data;
  }
  function logout() { localStorage.removeItem("hi_token"); localStorage.removeItem("hi_user"); setUser(null); }
  return <AuthContext.Provider value={{ user, requestOtp, verifyOtp, login, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
