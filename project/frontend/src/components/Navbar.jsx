function Navbar() {
  return (
    <div className="glass-panel flex h-16 items-center justify-between rounded-none border-x-0 border-t-0 px-4 text-slate-800 sm:px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-500">Chatify</p>
        <p className="text-sm text-slate-500">A cleaner, calmer workspace</p>
      </div>

      <div className="hidden items-center gap-3 sm:flex">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">C</div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Welcome back</p>
          <p className="text-xs text-slate-500">Ready to build</p>
        </div>
      </div>
    </div>
  );
}

export default Navbar;