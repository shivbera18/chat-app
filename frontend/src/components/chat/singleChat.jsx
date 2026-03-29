// src/components/chat/SingleChat.jsx
import React, { useEffect, useState, useRef, useContext } from "react";
import api from "../../services/api.js";
import socket from "../../services/socket.js";
import Message from "./message.jsx";
import { AuthContext } from "../../services/authContext.jsx";
import { LockChatModal } from "../modals/lockChatModal.jsx";

import { FiLock, FiSend } from "react-icons/fi";
import AvatarComponent from "../utils/avatar.jsx";
import { Skeleton } from "primereact/skeleton";
import { useAppHaptics } from "../../utils/useAppHaptics.js";
import { Button } from "../ui/button.jsx";

function SingleChat({ chat, friend, onUpdateChat }) {
  const { user } = useContext(AuthContext);
  const currentUserId = user?.id;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);
  const [member, setMember] = useState(null); //to display which member is typing in grp
  const [isFriendTyping, setIsFriendTyping] = useState(false); //to display friend is typing or not
  const [reactionsPopup, setReactionsPopup] = useState(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [ownMessageStatus, setOwnMessageStatus] = useState({});
  const inputRef = useRef(null);
  const lastSeenMessageRef = useRef(null);
  const { triggerClick, triggerError } = useAppHaptics();

  useEffect(() => {
    if (chat && chat.id && currentUserId) {
      socket.emit("joinRoom", { chatId: chat.id, userId: currentUserId });
    }
  }, [chat, currentUserId]);

  useEffect(() => {
    const handleReconnect = () => {
      if (chat && chat.id && currentUserId) {
        console.log("Socket reconnected, rejoining room:", chat.id);
        socket.emit("joinRoom", { chatId: chat.id, userId: currentUserId });
      }
    };

    socket.on("connect", handleReconnect);

    return () => {
      socket.off("connect", handleReconnect);
    };
  }, [chat, currentUserId]);

  useEffect(() => {
    if (chat && chat.id && !chat.isLocked) {
      setLoadingMessages(true);
      api
        .get(`/messages/${chat.id}`)
        .then((response) => {
          if (response.data && response.data.data) {
            const fetched = response.data.data;
            setMessages(fetched);
            const initialStatus = fetched.reduce((acc, msg) => {
              if (msg.senderId === currentUserId) {
                acc[msg.id] = "delivered";
              }
              return acc;
            }, {});
            setOwnMessageStatus(initialStatus);
            lastSeenMessageRef.current = null;
          }
        })
        .catch((err) => {
          console.error("Error fetching messages:", err);
          triggerError();
        })
        .finally(() => setLoadingMessages(false));
    }
  }, [chat]);

  useEffect(() => {
    const messageHandler = (message) => {
      if (message.chatId !== chat.id) return;

      setMessages((prev) => {
        const hasAlready = prev.some((item) => item.id === message.id);
        if (hasAlready) return prev;

        if (message.senderId === currentUserId && message.clientTempId) {
          return prev.map((item) =>
            item.clientTempId === message.clientTempId
              ? { ...message, pending: false }
              : item,
          );
        }

        return [...prev, message];
      });

      if (message.senderId === currentUserId) {
        setOwnMessageStatus((prev) => ({ ...prev, [message.id]: "delivered" }));
      }
    };

    const seenHandler = ({ chatId, messageId, userId }) => {
      if (chatId !== chat.id) return;
      if (userId === currentUserId) return;

      setOwnMessageStatus((prev) => ({ ...prev, [messageId]: "seen" }));
    };

    socket.on("receiveMessage", messageHandler);
    socket.on("messageSeenUpdate", seenHandler);
    return () => {
      socket.off("receiveMessage", messageHandler);
      socket.off("messageSeenUpdate", seenHandler);
    };
  }, [chat.id]);

  // Auto-scroll logic on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (input.trim() !== "" && chat && chat.id && currentUserId) {
      const clientTempId =
        globalThis.crypto?.randomUUID?.() || `temp-${Date.now()}`;

      const optimisticMessage = {
        id: clientTempId,
        clientTempId,
        text: input,
        senderId: currentUserId,
        senderName: user?.username,
        senderAvatar: user?.avatar,
        sentAt: new Date().toISOString(),
        chatId: chat.id,
        reactions: [],
        pending: true,
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      socket.emit("sendMessage", {
        chatId: chat.id,
        text: input,
        senderId: currentUserId,
        clientTempId,
      });
      setOwnMessageStatus((prev) => ({ ...prev, [clientTempId]: "sent" }));
      setInput("");
      triggerClick();
      // Optionally scroll after sending
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    setInput(""); // Clear input whenever the chat changes
    setOwnMessageStatus({});
    lastSeenMessageRef.current = null;
  }, [chat]);

  useEffect(() => {
    if (!chat?.id || !currentUserId || !messages.length) return;

    const lastIncoming = [...messages]
      .reverse()
      .find((msg) => msg.senderId !== currentUserId && !msg.pending);

    if (!lastIncoming) return;
    if (lastSeenMessageRef.current === lastIncoming.id) return;

    lastSeenMessageRef.current = lastIncoming.id;
    socket.emit("markSeen", {
      chatId: chat.id,
      messageId: lastIncoming.id,
      userId: currentUserId,
    });
  }, [messages, chat?.id, currentUserId]);

  const handleInputChange = (e) => {
    setInput(e.target.value);

    // notify server we’re typing
    socket.emit("typing", { chatId: chat.id, userId: currentUserId });

    clearTimeout(typingTimeout.current);
    // after 1.5s of no keystrokes, emit stopTyping
    typingTimeout.current = setTimeout(() => {
      socket.emit("stopTyping", { chatId: chat.id, userId: currentUserId });
    }, 1500);
  };

  useEffect(() => {
    const onTyping = ({ userId, chatId }) => {
      // if typing isnt in current chat, or its me who is typing, then do nothing.
      if (userId === currentUserId || chatId !== chat.id) return;

      api
        .get(`/user/profile/${userId}`)
        .then((response) => {
          if (response.data && response.data.data) {
            setMember(response.data.data);
          }
        })
        .catch((error) => {
          console.error("User not fetched!", error);
          triggerError();
        });
      setIsFriendTyping(true);
    };
    const onStop = ({ userId }) => {
      if (userId !== currentUserId) setIsFriendTyping(false);
    };

    socket.on("userTyping", onTyping);
    socket.on("userStopTyping", onStop);
    return () => {
      socket.off("userTyping", onTyping);
      socket.off("userStopTyping", onStop);
    };
  }, [currentUserId, chat]);

  useEffect(() => {
    socket.on("reaction-updated", ({ messageId, emoji, user, action }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          let reactions = msg.reactions || [];
          if (action === "removed") {
            reactions = reactions.filter((r) => !(r.user.id === user.id));
          } else {
            // filter out prev reaction, and add the new reaction {emoji,user} to it
            reactions = [
              ...reactions.filter((r) => r.user.id !== user.id),
              { emoji, user },
            ];
          }
          return { ...msg, reactions }; // this will update/overwrite the message with updated reactions
        }),
      );
    });
    return () => {
      socket.off("reaction-updated");
    };
  }, []);

  const handleReaction = async (messageId, emoji) => {
    try {
      await api.post(`/messages/${messageId}/${currentUserId}`, {
        reactionType: emoji,
      });
    } catch (err) {
      console.error("Failed to react:", err);
      triggerError();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (chat.isLocked) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-700 dark:text-gray-300 p-4">
        <div className="neo-card p-10 flex flex-col items-center max-w-sm w-full mx-auto relative overflow-hidden">
          {/* Decorative background blur */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-red-500/10 to-transparent pointer-events-none"></div>

          <div className="bg-[#ff8e72] p-5 rounded-full mb-6 shadow-[4px_4px_0_#111] z-10 border-[3px] border-black">
            <FiLock className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-2xl font-extrabold mb-3 text-black dark:text-white tracking-tight uppercase z-10">
            Chat Locked
          </h2>

          <p className="text-center mb-8 text-gray-600 dark:text-gray-300 leading-relaxed px-4 z-10">
            This conversation is secure. Please enter your passcode to view
            messages.
          </p>

          <button
            onClick={() => setShowUnlockModal(true)}
            className="w-full py-4 bg-[#7de2d1] text-black rounded-2xl font-bold text-lg z-10"
          >
            Unlock Chat
          </button>
        </div>

        {showUnlockModal && (
          <LockChatModal
            isOpen={showUnlockModal}
            onClose={() => setShowUnlockModal(false)}
            chat={chat}
            onUpdate={(updatedChat) => {
              if (onUpdateChat) onUpdateChat(updatedChat);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-[#09090b]">
      {/* Messages container */}
      <div
        ref={containerRef}
        className="flex-grow overflow-y-auto pl-4 pr-4 pt-5 pb-3 bg-[var(--ui-bg)] dark:bg-[#09090b] space-y-2 pb-24"
      >
        {loadingMessages ? (
          <div className="space-y-4">
            {[150, 105, 125, 180, 180, 148, 125, 160, 205, 110].map(
              (width, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${
                    i % 2 === 0 ? "justify-start" : "justify-end text-right"
                  }`}
                >
                  {i % 2 === 0 && chat.isGroup && (
                    <Skeleton shape="circle" size="32px" className="shrink-0" />
                  )}
                  <Skeleton
                    width={`${width}px`}
                    height="2.5rem"
                    borderRadius="15px"
                    style={{ backgroundColor: "#d2d9e0ff" }}
                  />
                </div>
              ),
            )}
          </div>
        ) : (
          messages.map((msg, index) => (
            <Message
              key={`${msg.id}-${index}`}
              message={msg}
              isGroup={chat.isGroup}
              isOwnMessage={msg.senderId === currentUserId}
              status={ownMessageStatus[msg.id]}
              onReact={handleReaction}
              onShowReactions={(messageId) => setReactionsPopup(messageId)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
        {reactionsPopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 dark:text-white p-6 max-w-sm w-full rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl">
              <h3 className="text-lg font-semibold mb-4">Reactions</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {/*  msg.reactions look like {emoji,user} */}
                {messages
                  .find((m) => m.id === reactionsPopup)
                  ?.reactions.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700"
                    >
                      <AvatarComponent
                        profilePicture={r.user.avatar}
                        displayName={r.user.username}
                        size={32}
                        avatarClasses="shrink-0 overflow-hidden"
                        boringAvatarClasses="shrink-0 overflow-hidden rounded-full"
                      />
                      <span className="font-medium text-gray-700 dark:text-white">
                        {r.user.username}
                      </span>
                      <span className="text-2xl ml-auto">{r.emoji}</span>
                    </div>
                  ))}
              </div>
              <button
                className="mt-4 px-4 py-2 bg-slate-200 text-slate-900 rounded-lg"
                onClick={() => setReactionsPopup(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input Box fixed at bottom */}
      <div className="flex-shrink-0 p-3 bg-white/95 dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-700">
        {isFriendTyping && (
          <div className="mx-4 mb-1 text-sm italic text-gray-600 dark:text-green-500 ">
            {chat.isGroup
              ? member && `${member.username} is typing…`
              : `${friend.username} typing…`}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder="Type a message..."
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-grow p-3 bg-slate-50 dark:bg-slate-900 dark:text-white rounded-2xl text-sm border border-slate-200 dark:border-slate-600 resize-none max-h-36"
          />
          <Button
            onClick={sendMessage}
            className="px-4 py-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-base disabled:opacity-60"
            disabled={!input.trim()}
          >
            <FiSend className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SingleChat;
