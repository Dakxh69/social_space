import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Search as SearchIcon, ArrowRight } from "lucide-react";
import { followUser, getFollowing, searchUsers, unfollowUser } from "../services/userService";

function Search() {
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth.user);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [followingIds, setFollowingIds] = useState(new Set());
  const [actionLoadingIds, setActionLoadingIds] = useState(new Set());

  useEffect(() => {
    const loadFollowing = async () => {
      if (!currentUser?.id) return;

      try {
        const data = await getFollowing(currentUser.id);
        const ids = new Set((data?.following || []).map((u) => String(u.id)));
        setFollowingIds(ids);
      } catch (err) {
        console.error("Failed to load following list", err);
      }
    };

    loadFollowing();
  }, [currentUser?.id]);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setUsers([]);
      setLoading(false);
      setError("");
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const data = await searchUsers(trimmed);
        const filtered = (data || []).filter((u) => String(u.id) !== String(currentUser?.id));
        setUsers(filtered);
      } catch (err) {
        console.error("User search failed", err);
        setUsers([]);
        setError(err?.response?.data?.detail || "Failed to search users");
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [query, currentUser?.id]);

  const toggleFollow = async (userId) => {
    const id = String(userId);
    const isFollowing = followingIds.has(id);

    setActionLoadingIds((prev) => new Set(prev).add(id));

    try {
      if (isFollowing) {
        await unfollowUser(userId);
        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        await followUser(userId);
        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      }
    } catch (err) {
      console.error("Follow action failed", err);
      setError(err?.response?.data?.detail || "Unable to update follow state");
    } finally {
      setActionLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="soft-card premium-outline relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.55),transparent_36%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.18),transparent_28%)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-500">Discover</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Search Users</h2>
        <p className="mt-2 text-sm text-slate-500">Find people to connect with in a soft, modern interface.</p>
      </div>

      <div className="soft-card flex items-center gap-3 px-5 py-4">
        <SearchIcon className="h-5 w-5 text-sky-400" />
        <input
          type="text"
          placeholder="Search users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="grid gap-4">
        {!query.trim() && <p className="text-sm text-slate-500">Type at least 1 character to search.</p>}

        {loading && <p className="text-sm text-slate-500">Searching users...</p>}

        {error && <p className="text-sm text-rose-600">{error}</p>}

        {!loading && query.trim() && users.length === 0 && !error && (
          <p className="text-sm text-slate-500">No users found.</p>
        )}

        {users.map((user) => {
          const userId = String(user.id);
          const isFollowing = followingIds.has(userId);
          const actionBusy = actionLoadingIds.has(userId);

          return (
            <div
              key={user.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/profile/${user.id}`, { state: { user } })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/profile/${user.id}`, { state: { user } });
                }
              }}
              className="soft-card flex cursor-pointer items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(14,165,233,0.14)]"
            >
              {user.profile_image ? (
                <img
                  src={user.profile_image}
                  alt={user.name}
                  className="h-12 w-12 rounded-full object-cover ring-4 ring-white shadow-md shadow-sky-200/40"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-sky-300 via-sky-200 to-cyan-200 ring-4 ring-white shadow-md shadow-sky-200/40" />
              )}

              <div className="min-w-0">
                <strong className="block truncate text-sm font-semibold text-slate-900">{user.name}</strong>
                <p className="m-0 text-sm text-slate-500">ID: {user.id}</p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFollow(user.id);
                }}
                disabled={actionBusy}
                className={`ml-auto rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  isFollowing
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-sky-500 text-white hover:bg-sky-600"
                } ${actionBusy ? "cursor-not-allowed opacity-65" : ""}`}
              >
                {actionBusy ? "Updating..." : isFollowing ? "Following" : "Follow"}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/chat");
                }}
                className="rounded-xl p-2 text-sky-500 transition hover:bg-sky-50"
                aria-label={`Open chat with ${user.name}`}
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Search;