// src/pages/LoginPage.jsx
// src/pages/LoginPage.jsx
import { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../services/authContext.jsx";
import api from "../services/api.js";
const bg = "/silksong.jpg";

export default function LoginPage() {
  const { setUser } = useContext(AuthContext);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      navigate(location.pathname, { replace: true });
    }

    api
      .get("/user/profile")
      .then((res) => {
        const user = res.data?.data;
        if (user) navigate("/chat");
      })
      .catch(() => {});
  }, [navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!identifier.trim()) {
      setError("Username or email is required");
      setLoading(false);
      return;
    }
    if (!password.trim()) {
      setError("Password is required");
      setLoading(false);
      return;
    }

    try {
      const loginResponse = await api.post("/auth/login", {
        identifier,
        password,
      });
      if (loginResponse.data?.success) {
        setUser(loginResponse.data.data.loggedInUser);
        localStorage.setItem("accessToken", loginResponse.data.data.accessToken);
        navigate("/chat");
      } else {
        setError(loginResponse.data?.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err.response?.data?.message) setError(err.response.data.message);
      else if (err.response?.status === 401) setError("Invalid email or password");
      else setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-center bg-cover relative px-4 py-8"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="absolute inset-0 bg-[var(--ui-bg)]" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="surface-panel rounded-[22px] p-8 backdrop-blur-xl bg-white dark:bg-[#202020]">
          <h1 className="text-3xl mb-2 text-slate-900 dark:text-white font-extrabold text-center tracking-tight">
            Welcome Back
          </h1>
          <p className="text-center text-slate-500 mb-6 text-sm">
            Login with your username or email
          </p>

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-100 border-[3px] border-black text-emerald-800 rounded-xl font-semibold">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-rose-100 border-[3px] border-black text-rose-800 rounded-xl font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            <input
              aria-label="Username or email"
              type="text"
              placeholder="Username or email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full p-3 soft-input placeholder-gray-500 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />

            <input
              aria-label="Password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 soft-input placeholder-gray-500 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 brand-gradient text-white font-semibold rounded-xl disabled:opacity-70"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/register")}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
            >
              Don&apos;t have an account? Register
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-700 mt-4 text-center font-semibold dark:text-slate-200">
          Ping — <a className="underline" href="https://ping-v1.vercel.app" target="_blank" rel="noreferrer">ping-v1.vercel.app</a>
        </p>
      </div>
    </div>
  );
}
