const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/chat/header.jsx', 'utf8');
code = code.replace(/return \(\n\s+<>\n\s+<header/, `return mini ? (
    <>
      <div className="relative" ref={menuRef}>
            <button
              onClick={() => {
                setMenuOpen((prev) => !prev);
                triggerClick();
              }}
              className={\`p-1 flex items-center gap-3 transition-colors \${menuOpen ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800"}\`}
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              <div className="relative">
                {user ? (
                  <AvatarComponent
                    profilePicture={profilePicture}
                    className="w-9 h-9 md:w-10 md:h-10 border border-slate-200 dark:border-slate-700 shadow-sm"
                  />
                ) : (
                  <Skeleton shape="circle" size="40px" />
                )}
                <div className="absolute inset-0 bg-black/opacity-0 hover:bg-black/5 rounded-full transition-colors" />
              </div>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 neo-card z-50 p-1.5 space-y-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl">
                <button onClick={() => { handleCreateChat(); triggerClick(); }} className="w-full flex items-center text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg">
                  <FiPlus className="mr-2" size={18} /><span>Create Chat</span>
                </button>
                <button onClick={() => { handleOpenChangeAvatar(); triggerClick(); }} className="w-full flex items-center text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg">
                  <FiCamera className="mr-2" size={18} /><span>Change Avatar</span>
                </button>
                <button onClick={() => { handleOpenChangeUsername(); triggerClick(); }} className="w-full flex items-center text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg">
                  <FiUser className="mr-2" size={18} /><span>Change Username</span>
                </button>
                <button onClick={() => { toggleDarkMode(); triggerClick(); }} className="w-full flex items-center text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg">
                  {darkMode ? <SunIcon className="h-5 w-5 text-yellow-500 mr-2" /> : <MoonIcon className="h-5 w-5 text-slate-700 mr-2" />}<span>Toggle Theme</span>
                </button>
                <button onClick={() => { handleLogout(); triggerClick(); }} className="w-full flex items-center text-left px-3 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg">
                  <FiLogOut className="mr-2" size={16} /><span>Logout</span>
                </button>
              </div>
            )}
      </div>
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
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-8 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-slate-700 transform transition-all scale-100">
            <h2 className="text-xl font-bold mb-6 dark:text-white">Change Username</h2>
            {error && <p className="text-red-500 mb-4 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-sm text-center font-medium">{error}</p>}
            <input type="text" className="w-full px-4 py-3 mb-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 focus:border-[#2196F3] dark:focus:border-[#2196F3] dark:text-white outline-none transition-all duration-300 placeholder-gray-400 font-medium" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Enter new username" autoFocus />
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowChangeUsernameModal(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button onClick={handleUpdateUsername} className="px-6 py-3 bg-[#2196F3] hover:bg-[#1976D2] text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all duration-300">Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  ) : (
    <>
      <header`);
fs.writeFileSync('frontend/src/components/chat/header.jsx', code);
