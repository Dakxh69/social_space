import { useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { logoutUser } from "../services/authService";
import { getUserById } from "../services/userService";
import { clearUser, setUser } from "../store/slices/authSlice";
import { Home, Search, MessageCircle, Settings, LogOut, Sparkles } from "lucide-react";

function Sidebar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);
  const initials = currentUser?.name ? currentUser.name.slice(0, 1).toUpperCase() : "U";

  useEffect(() => {
    if (!currentUser?.id || currentUser.bio !== undefined) return;

    getUserById(currentUser.id)
      .then((data) => {
        if (data) {
          dispatch(setUser({ ...currentUser, bio: data.bio }));
        }
      })
      .catch((err) => {
        console.error("Failed to fetch current user profile bio", err);
      });
  }, [currentUser?.id, currentUser?.bio, dispatch]);

  return (
    <aside className="glass-panel sticky top-0 flex h-screen w-[280px] flex-col border-r border-white/60 px-4 py-5 shadow-none backdrop-blur-2xl">
      <div className="premium-outline rounded-[28px] bg-gradient-to-br from-sky-500 via-sky-500 to-cyan-400 p-5 text-white shadow-[0_20px_50px_rgba(14,165,233,0.28)]">
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="mb-4 flex w-full items-center gap-3 text-left transition hover:opacity-95"
        >
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/18 ring-1 ring-white/30">
            {currentUser?.profile_image ? (
              <img src={currentUser.profile_image} alt={currentUser?.name || "User"} className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-semibold">{initials}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.35em] text-white/80">Profile</p>
            <h2 className="truncate text-xl font-semibold">{currentUser?.name || "Guest"}</h2>
            <p className="truncate text-sm text-white/80">{currentUser?.email || "Signed in account"}</p>
          </div>
        </button>
        <p className="text-sm leading-6 text-white/86">{currentUser?.bio || "No bio yet."}</p>
      </div>

      <nav className="mt-6 flex flex-col gap-2">
        <NavLink to="/home" className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${isActive ? 'bg-sky-100 text-sky-700 shadow-[0_10px_24px_rgba(14,165,233,0.12)]' : 'text-slate-600 hover:bg-white/75 hover:text-slate-900'}`}>
          <Home className="h-4 w-4" />
          Home
        </NavLink>

        <NavLink to="/search" className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${isActive ? 'bg-sky-100 text-sky-700 shadow-[0_10px_24px_rgba(14,165,233,0.12)]' : 'text-slate-600 hover:bg-white/75 hover:text-slate-900'}`}>
          <Search className="h-4 w-4" />
          Search
        </NavLink>

        <NavLink to="/chat" className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${isActive ? 'bg-sky-100 text-sky-700 shadow-[0_10px_24px_rgba(14,165,233,0.12)]' : 'text-slate-600 hover:bg-white/75 hover:text-slate-900'}`}>
          <MessageCircle className="h-4 w-4" />
          Chats
        </NavLink>

        <NavLink to="/settings" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-white/70 hover:text-slate-900">
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>
      </nav>

      <div className="mt-auto rounded-[28px] border border-sky-100 bg-white/78 p-4 shadow-[0_16px_40px_rgba(14,165,233,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-500">Account</p>
        <button
          onClick={async () => {
            try {
              await logoutUser();
            } catch (err) {
              console.error("Logout failed", err);
            }

            dispatch(clearUser());

            navigate("/login");
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;