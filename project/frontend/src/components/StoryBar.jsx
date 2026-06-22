import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getFollowing } from "../services/userService";

function StoryBar() {
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth.user);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadFollowingUsers = async () => {
      if (!currentUser?.id) {
        setFollowingUsers([]);
        return;
      }

      setLoading(true);
      try {
        const data = await getFollowing(currentUser.id);
        setFollowingUsers(data?.following || []);
      } catch (err) {
        console.error("Failed to load followed users", err);
        setFollowingUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadFollowingUsers();
  }, [currentUser?.id]);

  return (
    <div className="soft-card mb-5 overflow-x-auto p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-500">Following</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">People you follow</h3>
        </div>
        <p className="text-xs text-slate-500">{loading ? "Loading..." : `${followingUsers.length} users`}</p>
      </div>

      <div className="flex gap-4">
        {followingUsers.length === 0 && !loading ? (
          <div className="rounded-2xl border border-dashed border-sky-100 bg-sky-50/60 px-4 py-5 text-sm text-slate-500">
            You are not following anyone yet.
          </div>
        ) : (
          followingUsers.map((user) => {
            const initial = user?.name ? user.name.slice(0, 1).toUpperCase() : "U";

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => navigate(`/profile/${user.id}`, { state: { user } })}
                className="flex min-w-[72px] flex-col items-center gap-2 transition hover:-translate-y-0.5"
              >
                {user.profile_image ? (
                  <img
                    src={user.profile_image}
                    alt={user.name || "User"}
                    className="h-14 w-14 rounded-full object-cover ring-4 ring-white shadow-md shadow-sky-200/50"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-300 ring-4 ring-white shadow-md shadow-sky-200/50">
                    <span className="text-sm font-semibold text-white">{initial}</span>
                  </div>
                )}

                <p className="max-w-[72px] truncate text-center text-xs font-medium text-slate-600">
                  {user.name || "User"}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default StoryBar;