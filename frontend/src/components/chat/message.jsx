import React from "react";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import AvatarComponent from "../utils/avatar.jsx";
import { motion } from "motion/react";

import Picker from "emoji-picker-react";

export default function Message({
  message,
  isOwnMessage,
  isGroup,
  onReact,
  onShowReactions,
  status,
}) {
  const time = format(new Date(message.sentAt || message.createdAt), "hh:mm a");

  const reactions = message.reactions ?? [];
  const counts = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  const [showPicker, setShowPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const [pickerStyles, setPickerStyles] = useState({ top: 0, left: 0 });
  const pickerRef = useRef(null);

  // When showPicker or initial position changes, adjust to stay on-screen
  useEffect(() => {
    if (!showPicker || !pickerRef.current) return;

    const { offsetWidth: w, offsetHeight: h } = pickerRef.current;
    let x = pickerPosition.x;
    let y = pickerPosition.y;

    // clamp horizontally
    if (x + w > window.innerWidth - 8) {
      x = window.innerWidth - w - 8;
    }
    if (x < 8) x = 8;

    // clamp vertically
    if (y + h > window.innerHeight - 8) {
      y = window.innerHeight - h - 8;
    }
    if (y < 8) y = 8;

    setPickerStyles({ top: y, left: x });
  }, [showPicker, pickerPosition]);

  useEffect(() => {
    const onClick = (ev) => {
      if (pickerRef.current && !pickerRef.current.contains(ev.target)) {
        setShowPicker(false);
      }
    };
    if (showPicker) document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [showPicker]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    setPickerPosition({ x: e.clientX, y: e.clientY });
    setShowPicker(true);
  };

  const handleEmojiClick = (emojiData) => {
    onReact(message.id, emojiData.emoji); // call the parent to handle DB update
    setShowPicker(false);
  };

  const statusLabel =
    status === "seen" ? "✓✓" : status === "delivered" ? "✓✓" : "✓";
  const statusColor =
    status === "seen"
      ? "text-cyan-200"
      : status === "delivered"
        ? "text-slate-200"
        : "text-slate-300";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={`flex items-end gap-2 mb-1 px-2 ${
        isOwnMessage ? "justify-end" : "justify-start"
      }`}
    >
      {/* Avatar for group messages */}
      {!isOwnMessage && isGroup && (
        <AvatarComponent
          profilePicture={message.senderAvatar}
          displayName={message.senderName}
          size={32}
          avatarClasses="shrink-0 overflow-hidden [&_img]:object-cover [&_img]:w-full [&_img]:h-full"
          boringAvatarClasses="shrink-0 overflow-hidden rounded-full"
        />
      )}

      <div
        className={`relative px-3 py-2 rounded-2xl max-w-[80%] w-fit border shadow-sm
          ${
            isOwnMessage
              ? "bg-blue-600 text-white rounded-br-md border-blue-500"
              : "bg-white text-slate-800 rounded-bl-md border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
          }
        `}
        onContextMenu={handleContextMenu}
        style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
      >
        {/* Sender name for group chat */}
        {isGroup && !isOwnMessage && (
          <div className="text-xs font-semibold text-blue-600 mb-0.5 uppercase tracking-wide">
            {message.senderName}
          </div>
        )}
        <div className="flex flex-wrap items-baseline gap-1 break-words whitespace-pre-wrap">
          <div className="text-base">{message.text}</div>
          <span
            className={`text-[11px] ml-2 mt-0.5 ${
              isOwnMessage ? "text-blue-100" : "text-slate-500"
            }`}
          >
            {time}
          </span>
          {isOwnMessage && (
            <span
              className={`text-[10px] font-bold tracking-tight ${statusColor}`}
              title={status || "sent"}
            >
              {statusLabel}
            </span>
          )}
        </div>
        {Object.keys(counts).length > 0 && (
          <div
            className="flex items-center space-x-1 ml-2 mt-2 cursor-pointer"
            onClick={() => onShowReactions(message.id)}
          >
            {Object.entries(counts).map(([emoji, cnt]) => (
              <span
                key={emoji}
                className="flex items-center px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-xs text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600"
              >
                <span className="mr-1">{emoji}</span>
                <span>{cnt}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      {showPicker && (
        <div
          ref={pickerRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            top: pickerStyles.top,
            left: pickerStyles.left,
          }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 border-[3px] border-black"
        >
          <Picker
            reactionsDefaultOpen={true}
            onEmojiClick={handleEmojiClick}
            className="z-10"
          />
        </div>
      )}
    </motion.div>
  );
}
