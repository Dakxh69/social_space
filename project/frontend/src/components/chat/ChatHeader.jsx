function ChatHeader({ name = "Alex", online = true }) {
  // BACKEND INTEGRATION POINT
  // selectedUser.name
  // selectedUser.online

  return (
    <div className="glass-panel flex items-center gap-3 border-b border-white/60 px-5 py-4">
      <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gradient-to-br from-sky-300 to-cyan-300 ring-4 ring-white" />

      <div>
        <h4 className="m-0 text-base font-semibold text-slate-900">{name}</h4>

        <p className={`m-0 text-sm ${online ? "text-emerald-500" : "text-slate-500"}`}>
          {online ? "Online" : "Offline"}
        </p>
      </div>
    </div>
  );
}

export default ChatHeader;
