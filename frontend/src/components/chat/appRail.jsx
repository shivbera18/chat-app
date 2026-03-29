import { FiHome, FiMessageSquare, FiSettings, FiUser } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";

export function AppRail() {
  const navigate = useNavigate();
  return (
    <div className="w-16 md:w-20 h-full border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col items-center py-6 gap-6">
      <div className="p-3 bg-blue-600 rounded-2xl text-white cursor-pointer hover:bg-blue-700 transition" onClick={() => navigate("/chat")}>
        <FiMessageSquare strokeWidth={2.5} size={24} />
      </div>
      <div className="flex-1"></div>
      <div className="p-3 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer transition">
        <FiUser size={24} />
      </div>
      <div className="p-3 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer transition">
        <FiSettings size={24} />
      </div>
    </div>
  );
}
