// src/pages/NewChatPage.jsx
import React, { useContext } from "react";
import CreateChat from "../components/chat/createChat.jsx";
import { AuthContext } from "../services/authContext.jsx";
import Header from "../components/chat/header.jsx";

function NewChatPage() {
  const { user } = useContext(AuthContext);

  return (
    <>
      <Header />
      <div className="min-h-screen p-4 md:p-6 bg-[var(--ui-bg)] dark:bg-[#09090b] text-gray-900 dark:text-white">
        <div className="surface-panel p-5 md:p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Start a New Chat</h1>
        {user ? (
          <CreateChat currentUserId={user.id} />
        ) : (
          <p>Please log in to start a chat.</p>
        )}
        </div>
      </div>
    </>
  );
}

export default NewChatPage;
