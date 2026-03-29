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
    <div className="h-screen flex flex-col bg-[#eef1f7] text-gray-900 dark:bg-slate-950 dark:text-dark-text">
      <Header onMenuClick={() => setShowSidebar((v) => !v)} />
      {/* Main content area */}
      <div className="flex flex-grow overflow-hidden relative p-2 md:p-4">
        <div className="surface-panel w-full flex overflow-hidden">
        {/* Sidebar for AllChats */}
        <aside
          className={`
            ${showSidebar ? "block" : "hidden"} 
            md:block
            w-full md:w-64 lg:w-80 h-full absolute md:relative z-20
            bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
          `}
          onClick={() => {
            setShowSidebar(false);
          }}
        >
          <AllChats />
        </aside>

        {/* Chat area */}
        {!showSidebar && (
          <main className="flex flex-col flex-grow min-h-0 overflow-hidden">
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
                <div className="flex-grow min-h-0">
                  <SingleChat
                    chat={activeChat}
                    friend={friend}
                    onUpdateChat={setActiveChat} //will update the activeChat, from returned lockedChat/unlockedChat apis
                  />
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="flex flex-grow items-center justify-center flex-col space-y-4 dark:text-primary bg-[#f9fbff] dark:bg-slate-900"
              >
                <p className="text-slate-500 font-medium text-center px-4">
                  Select or create a chat to view messages.
                </p>
                <Button
                  onClick={() => navigate("/new-chat")}
                  className="p-4 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center space-x-2"
                >
                  <FiPlus className="w-6 h-6" />
                  <span>Create New Chat</span>
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
