// src/pages/ChatPage.jsx
import { useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../services/authContext.jsx";
import Header from "../components/chat/header.jsx";
import AllChats from "../components/chat/allChats.jsx";
import SingleChat from "../components/chat/singleChat.jsx";
import ChatNavbar from "../components/chat/chatNavbar.jsx";
import api from "../services/api.js";
import { Button } from "../components/ui/button.jsx";
import { motion } from "motion/react";

import { FiPlus } from "react-icons/fi";

function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useContext(AuthContext);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const [activeChat, setActiveChat] = useState(location.state?.chat);
  const friend = location.state?.friend;

  // triggered on first mounting and switching btw diff chats
  useEffect(() => {
    if (location.state?.chat) {
      const chatFromState = location.state.chat;
      setActiveChat(chatFromState);

      api
        .get(`/chat/isLocked/${chatFromState.id}`)
        .then((res) => {
          const freshLocked = res.data.data;
          if (freshLocked !== chatFromState.isLocked) {
            // to update the stale data
            setActiveChat((prev) => ({ ...prev, isLocked: freshLocked }));
          }
        })
        .catch((err) => console.error("Failed to refresh lock status", err));
    } else {
      setActiveChat(null);
    }
  }, [location.state?.chat]);

  return (
    <div className="fixed inset-0 h-[100dvh] flex flex-col bg-[var(--ui-bg)] text-[var(--ui-ink)] overflow-hidden">
      <Header onMenuClick={() => setShowSidebar((v) => !v)} />
      {/* Main content area */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden relative p-2 md:p-4">
        <div className="surface-panel w-full h-full min-h-0 flex overflow-hidden">
        {/* Sidebar for AllChats */}
        <aside
          className={`
            ${showSidebar ? "block" : "hidden"} 
            md:block
            w-full md:w-64 lg:w-80 h-full absolute md:relative z-20
            bg-white dark:bg-[#09090b] border-r border-slate-200 dark:border-slate-800
          `}
          onClick={() => {
            setShowSidebar(false);
          }}
        >
          <AllChats />
        </aside>

        {/* Chat area */}
        {!showSidebar && (
          <main className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {activeChat ? (
              <>
                {/* Chat Navbar Container */}
                <div className="flex-none">
                  <ChatNavbar
                    chat={activeChat}
                    friend={friend}
                    onUpdateChat={setActiveChat} //will update the activeChat, from returned lockedChat/unlockedChat apis
                  />
                </div>
                {/* Single Chat Container - scrolling handled inside SingleChat */}
                <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
                  <SingleChat
                    chat={activeChat}
                    friend={friend}
                    onUpdateChat={setActiveChat} //will update the activeChat, from returned lockedChat/unlockedChat apis
                  />
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="flex flex-1 items-center justify-center flex-col space-y-8 bg-[var(--ui-bg)] dark:bg-[#09090b] p-6"
              >
                <div className="w-48 h-48 bg-white border-[4px] border-black shadow-[8px_8px_0_0_#000] rounded-xl flex items-center justify-center rotate-3 hover:rotate-6 transition-transform duration-300">
                   <div className="text-6xl">💬</div>
                </div>
                <div className="text-center space-y-2 max-w-sm">
                  <h2 className="text-3xl font-black uppercase tracking-tight text-black dark:text-white">Hit someone up!</h2>
                  <p className="text-black/70 dark:text-white/70 font-semibold text-lg">
                    Select a conversation from the sidebar or start a fresh one.
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/new-chat")}
                  className="py-4 px-8 rounded-xl bg-[var(--ui-accent)] text-black border-[3px] border-black shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all flex items-center space-x-3 font-bold text-lg focus-visible:ring-4 focus-visible:ring-black outline-none"
                >
                  <FiPlus className="w-6 h-6" />
                  <span>START CHATTING</span>
                </Button>
              </motion.div>
            )}
          </main>
        )}
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
