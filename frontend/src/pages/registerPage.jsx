// src/pages/RegisterPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api.js";
const bg = "/silksong.jpg";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email.trim()) { setError("Email is required"); setLoading(false); return; }
    if (!username.trim()) { setError("Username is required"); setLoading(false); return; }
    if (!password.trim()) { setError("Password is required"); setLoading(false); return; }
    if (!confirmPassword.trim()) { setError("Please confirm your password"); setLoading(false); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); setLoading(false); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters long"); setLoading(false); return; }
    if (username.length < 3) { setError("Username must be at least 3 characters long"); setLoading(false); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError("Please enter a valid email address"); setLoading(false); return; }
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) { setError("Username can only contain letters, numbers, and underscores"); setLoading(false); return; }

    try {
      const response = await api.post("/auth/register", { email, username, password });
      if (response.data?.success) {
        navigate("/", { state: { message: "Registration successful! Please login with your credentials." }});
      } else {
        setError(response.data?.message || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      if (err.response?.data?.message) {
        const msg = err.response.data.message.toLowerCase();
        if (msg.includes("username")) setError("Username already exists. Please choose a different username.");
        else if (msg.includes("email")) setError("Email already exists. Please use a different email address.");
        else setError(err.response.data.message);
      } else if (Array.isArray(err.response?.data?.errors) && err.response.data.errors.length > 0) {
        setError(err.response.data.errors[0]);
      } else if (err.response?.status === 409) setError("Username or email already exists");
      else if (err.code === "ERR_NETWORK") setError("Cannot reach backend server. Start backend and try again.");
      else setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-center bg-cover relative px-4 py-8"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#e7edf8]/85 via-[#eef2fb]/85 to-[#edf6ff]/85" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="surface-panel p-8">
          <h1 className="text-3xl mb-4 text-slate-900 dark:text-white font-extrabold text-center tracking-tight">Create Account</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 border-[3px] border-black rounded-xl font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            <input aria-label="Email" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full p-3 soft-input placeholder-gray-500 text-slate-900 dark:text-slate-100 focus:outline-none" />
            <div>
              <input aria-label="Username" type="text" placeholder="Username (3+ characters)" value={username} onChange={e => setUsername(e.target.value)}
                className="w-full p-3 soft-input placeholder-gray-500 text-slate-900 dark:text-slate-100 focus:outline-none" />
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-semibold">Only letters, numbers, and underscores allowed</p>
            </div>
            <input aria-label="Password" type="password" placeholder="Password (6+ characters)" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full p-3 soft-input placeholder-gray-500 text-slate-900 dark:text-slate-100 focus:outline-none" />
            <input aria-label="Confirm Password" type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="w-full p-3 soft-input placeholder-gray-500 text-slate-900 dark:text-slate-100 focus:outline-none" />

            <button disabled={loading} className="w-full py-3 text-white rounded-xl brand-gradient disabled:opacity-70">
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => navigate("/")} className="px-4 py-2 text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-200 rounded-lg">
              Already have an account? Login
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-700 dark:text-slate-200 mt-4 text-center font-semibold">
          Ping — <a className="underline" href="https://ping-v1.vercel.app" target="_blank" rel="noreferrer">ping-v1.vercel.app</a>
        </p>
      </div>
    </div>
  );
}
