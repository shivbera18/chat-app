import React, { useEffect, useContext, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api.js";
import { AuthContext } from "../../services/authContext.jsx";
import { ChangeAvatarModal } from "../modals/changeAvatarModal.jsx";

import { FiPlus, FiCamera, FiLogOut, FiUser, FiMenu } from "react-icons/fi";
import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";
import AvatarComponent from "../utils/avatar.jsx";
import { Skeleton } from "primereact/skeleton";
import { useAppHaptics } from "../../utils/useAppHaptics.js";

function Header({ onMenuClick }) {
  const { user, setUser, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showChangeAvatarModal, setShowChangeAvatarModal] = useState(false);
  const [showChangeUsernameModal, setShowChangeUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const menuRef = useRef(null);
  const [darkMode, setDarkMode] = useState(false);
  const [error, setError] = useState("");
  const { triggerClick, triggerError } = useAppHaptics();

  // Check local storage for theme preference on initial load and apply dark mode if set
  // This runs only once when the component mounts
  // and sets the initial dark mode state based on localStorage
  // This is useful for maintaining the user's theme preference across sessions
  // This ensures that the dark mode is applied immediately when the app loads
  // and the user doesn't see a flash of light mode before the theme is applied
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
    setDarkMode(!darkMode);
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await api.get("/auth/logout");
    setUser(null);
    localStorage.removeItem("accessToken");
    navigate("/");
  };

  const handleCreateChat = () => {
    navigate("/new-chat");
    setMenuOpen(false);
  };

  const handleOpenChangeAvatar = () => {
    setShowChangeAvatarModal(true);
    setMenuOpen(false);
  };

  const handleOpenChangeUsername = () => {
    setNewUsername(user?.username || "");
    setShowChangeUsernameModal(true);
    setMenuOpen(false);
  };

  const handleUpdateUsername = async () => {
    try {
      const res = await api.post("/user/updateUsername", {
        newUsername: newUsername,
      });
      if (res.data?.data.updatedUser) {
        setUser(res.data.updatedUser);
      }
      setShowChangeUsernameModal(false);
    } catch (err) {
      const message = err.response.data.message;
      setError(message);
      triggerError();
    }
  };

  const profilePicture = user && user.avatar ? user.avatar : null;

  return (
    <>
      <header className="sticky top-0 z-50 px-3 py-3 md:px-5 bg-[#eef1f7]/90 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="surface-panel px-3 py-2 md:px-4 md:py-3 flex justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            {onMenuClick && (
              <button
                onClick={() => {
                  onMenuClick();
                  triggerClick();
                }}
                className="md:hidden p-2 bg-white dark:bg-slate-900"
                aria-label="Toggle sidebar"
              >
                <FiMenu className="h-5 w-5 text-slate-700 dark:text-slate-200" />
              </button>
            )}
            <button
              onClick={() => {
                navigate("/chat", { state: {} });
                triggerClick();
              }}
              className="px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-extrabold tracking-tight"
            >
              Ping
            </button>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => {
                setMenuOpen((prev) => !prev);
                triggerClick();
              }}
              className="flex items-center justify-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900"
              title="Profile Menu"
            >
              <div className="relative shrink-0 w-[40px] h-[40px]">
                {loading ? (
                  <Skeleton
                    shape="circle"
                    size="40px"
                    className="absolute inset-0"
                  />
                ) : (
                  <AvatarComponent
                    profilePicture={user?.avatar}
                    displayName={user?.username}
                    size="40px"
                    avatarClasses="shrink-0 overflow-hidden"
                    boringAvatarClasses="shrink-0 overflow-hidden rounded-full"
                  />
                )}
              </div>

              <div className="relative h-8 items-center min-w-[90px] hidden sm:flex">
                {loading ? (
                  <Skeleton width="95px" height="1.2rem" />
                ) : (
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[95px]">
                    {user?.username}
                  </span>
                )}
              </div>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 neo-card z-50 p-1.5 space-y-1">
                <button
                  onClick={() => {
                    handleCreateChat();
                    triggerClick();
                  }}
                  className="w-full flex items-center text-left px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  <FiPlus className="mr-2" size={18} />
                  <span>Create Chat</span>
                </button>
                <button
                  onClick={() => {
                    handleOpenChangeAvatar();
                    triggerClick();
                  }}
                  className="w-full flex items-center text-left px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  <FiCamera className="mr-2" size={18} />
                  <span>Change Avatar</span>
                </button>
                <button
                  onClick={() => {
                    handleOpenChangeUsername();
                    triggerClick();
                  }}
                  className="w-full flex items-center text-left px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  <FiUser className="mr-2" size={18} />
                  <span>Change Username</span>
                </button>
                <button
                  onClick={() => {
                    toggleDarkMode();
                    triggerClick();
                  }}
                  className="w-full flex items-center text-left px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  {darkMode ? (
                    <SunIcon className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <MoonIcon className="h-5 w-5 text-slate-700" />
                  )}
                  <span className="pl-2">Toggle Theme</span>
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    triggerClick();
                  }}
                  className="w-full flex items-center text-left px-3 py-2 text-white bg-rose-500"
                >
                  <FiLogOut className="mr-2" size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
      {showChangeAvatarModal && (
        <ChangeAvatarModal
          currentAvatar={profilePicture}
          onClose={() => setShowChangeAvatarModal(false)}
          onUpload={(responseData) => {
            if (responseData.updatedUser) setUser(responseData.updatedUser);
            setShowChangeAvatarModal(false);
          }}
          displayName={user?.username}
        />
      )}

      {showChangeUsernameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/40 transition-opacity duration-300">
          <div className="bg-white dark:bg-[rgb(0,7,28)] w-full max-w-sm p-8 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800 transform transition-all scale-100">
            <h2 className="text-xl font-bold mb-6 dark:text-white">
              Change Username
            </h2>
            {error && (
              <p className="text-red-500 mb-4 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-sm text-center font-medium">
                {error}
              </p>
            )}
            <input
              type="text"
              className="w-full px-4 py-3 mb-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 focus:border-[#2196F3] dark:focus:border-[#2196F3] dark:text-white outline-none transition-all duration-300 placeholder-gray-400 font-medium"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter new username"
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowChangeUsernameModal(false);
                  triggerClick();
                }}
                className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleUpdateUsername();
                  triggerClick();
                }}
                className="px-6 py-3 bg-[#2196F3] hover:bg-[#1976D2] text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-300 active:scale-[0.98]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
