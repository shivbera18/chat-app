// src/pages/LoginPage.jsx
// src/pages/LoginPage.jsx
import { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../services/authContext.jsx";
import api from "../services/api.js";
const bg = "/silksong.jpg";

export default function LoginPage() {
  const { setUser } = useContext(AuthContext);
  const [email, setEmail] = useState("");
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

    if (!email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }
    if (!password.trim()) {
      setError("Password is required");
      setLoading(false);
      return;
    }

    try {
      const loginResponse = await api.post("/auth/login", { email, password });
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
      <div className="absolute inset-0 bg-[#fff7cd]/50" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="neo-card p-8">
          <h1 className="text-3xl mb-4 text-black font-extrabold text-center uppercase tracking-tight">Welcome back</h1>

          {successMessage && (
            <div className="mb-4 p-3 bg-[#b4f3d5] border-[3px] border-black text-black rounded-xl font-semibold">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-[#ff8e72] border-[3px] border-black text-black rounded-xl font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            <input
              aria-label="Email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-white placeholder-gray-500 text-black focus:outline-none"
            />

            <input
              aria-label="Password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-white placeholder-gray-500 text-black focus:outline-none"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-black disabled:opacity-70"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/register")}
              className="px-4 py-2 text-black bg-[#7de2d1]"
            >
              Don&apos;t have an account? Register
            </button>
          </div>
        </div>

        <p className="text-xs text-black mt-4 text-center font-semibold">
          Ping — <a className="underline" href="https://ping-v1.vercel.app" target="_blank" rel="noreferrer">ping-v1.vercel.app</a>
        </p>
      </div>
    </div>
  );
}
