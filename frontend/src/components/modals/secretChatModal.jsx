import React from "react";

function SecretChatModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
      <div className="surface-panel w-full max-w-sm p-6">
        <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">
          Secret Chat Under Construction
        </h2>
        <p className="mb-4 text-slate-600 dark:text-slate-300">
          This feature is currently under construction.
        </p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg dark:bg-white dark:text-slate-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default SecretChatModal;
