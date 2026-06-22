import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ArrowLeft, Heart, Grid3X3, Users, UserRound, X } from "lucide-react";
import { getFeed } from "../services/postService";
import { getFollowers, getFollowing, updateProfile, followUser, unfollowUser, getUserById } from "../services/userService";
import { setUser } from "../store/slices/authSlice";

function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useParams();
  const currentUser = useSelector((state) => state.auth.user);

  const routeUserId = userId ? Number(userId) : null;
  const initialUser = location.state?.user || (routeUserId && currentUser?.id === routeUserId ? currentUser : null) || currentUser;

  const [profileUser, setProfileUser] = useState(initialUser);
  const [posts, setPosts] = useState([]);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dispatch = useDispatch();

  // Edit Profile States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editFile, setEditFile] = useState(null);
  const [editFilePreview, setEditFilePreview] = useState(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updateError, setUpdateError] = useState("");

  // Followers / Following Lists States
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [myFollowingIds, setMyFollowingIds] = useState(new Set());
  const [activeListModal, setActiveListModal] = useState(null); // 'followers' | 'following' | null
  const [listError, setListError] = useState("");

  const viewedUserId = useMemo(() => {
    return routeUserId || currentUser?.id || location.state?.user?.id || null;
  }, [routeUserId, currentUser?.id, location.state?.user?.id]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!viewedUserId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const allPosts = [];
        const limit = 50;

        for (let page = 1; page <= 10; page += 1) {
          const batch = await getFeed(page, limit);
          allPosts.push(...(batch || []));

          if ((batch || []).length < limit) {
            break;
          }
        }

        const userPosts = allPosts.filter((post) => String(post.user?.id) === String(viewedUserId));

        const uniquePosts = Array.from(new Map(userPosts.map((post) => [post.id, post])).values());
        setPosts(uniquePosts);

        const userFromPosts = uniquePosts[0]?.user || null;
        const fallbackUser =
          location.state?.user ||
          (String(viewedUserId) === String(currentUser?.id) ? currentUser : null) ||
          userFromPosts ||
          { id: viewedUserId, name: `User ${viewedUserId}`, profile_image: null };

        setProfileUser(fallbackUser);

        try {
          const fetchedUser = await getUserById(viewedUserId);
          setProfileUser(fetchedUser);
        } catch (err) {
          console.error("Failed to fetch user by ID", err);
        }

        const followingData = await getFollowing(viewedUserId);
        const following = followingData?.following || [];
        setFollowingList(following);
        setFollowingCount(followingData?.count ?? following.length ?? 0);

        const followersData = await getFollowers(viewedUserId);
        const followers = followersData?.followers || [];
        setFollowersList(followers);
        setFollowersCount(followersData?.count ?? followers.length ?? 0);

        if (currentUser) {
          if (String(viewedUserId) === String(currentUser.id)) {
            setMyFollowingIds(new Set(following.map((u) => u.id)));
          } else {
            try {
              const myFollowingData = await getFollowing(currentUser.id);
              const myFollowing = myFollowingData?.following || [];
              setMyFollowingIds(new Set(myFollowing.map((u) => u.id)));
            } catch (err) {
              console.error("Failed to load current user following list", err);
            }
          }
        }

      } catch (err) {
        console.error("Failed to load profile", err);
        setError(err?.response?.data?.detail || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [viewedUserId, currentUser, location.state?.user]);

  const isOwnProfile = String(viewedUserId) === String(currentUser?.id);

  useEffect(() => {
    return () => {
      if (editFilePreview && editFile) {
        URL.revokeObjectURL(editFilePreview);
      }
    };
  }, [editFilePreview, editFile]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setUpdateError("");

    try {
      const result = await updateProfile(editBio, editFile);
      const updatedUser = result?.user;
      if (updatedUser) {
        setProfileUser(updatedUser);
        dispatch(setUser(updatedUser));
      }
      setIsEditModalOpen(false);
      if (editFilePreview && editFile) {
        URL.revokeObjectURL(editFilePreview);
      }
      setEditFile(null);
      setEditFilePreview(null);
    } catch (err) {
      console.error("Failed to update profile", err);
      setUpdateError(err?.response?.data?.detail || "Failed to update profile");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleFollowToggleInList = async (targetUser) => {
    const targetId = targetUser.id;
    const isFollowingTarget = myFollowingIds.has(targetId);
    setListError("");

    try {
      if (isFollowingTarget) {
        await unfollowUser(targetId);
        setMyFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });

        if (isOwnProfile) {
          setFollowingList((prev) => prev.filter((u) => u.id !== targetId));
          setFollowingCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        await followUser(targetId);
        setMyFollowingIds((prev) => {
          const next = new Set(prev);
          next.add(targetId);
          return next;
        });

        if (isOwnProfile) {
          setFollowingList((prev) => [...prev, targetUser]);
          setFollowingCount((prev) => prev + 1);
        }
      }
    } catch (err) {
      console.error("Failed to toggle follow in list", err);
      setListError(err?.response?.data?.detail || "Action failed");
    }
  };

  if (loading) {
    return <div className="soft-card p-6 text-slate-600">Loading profile...</div>;
  }

  if (error) {
    return <div className="soft-card p-6 text-rose-500">{error}</div>;
  }

  const displayName = profileUser?.name || "User";
  const profileImage = profileUser?.profile_image;
  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <section className="soft-card premium-outline overflow-hidden">
        <div className="h-40 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.32),transparent_30%),linear-gradient(135deg,rgba(224,242,254,0.9),rgba(255,255,255,0.95))]" />

        <div className="px-6 pb-6 sm:px-8">
          <div className="-mt-16 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="relative h-32 w-32 overflow-hidden rounded-[32px] border-4 border-white bg-white shadow-[0_20px_50px_rgba(14,165,233,0.18)] ring-1 ring-sky-100">
                {profileImage ? (
                  <img src={profileImage} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-400 via-sky-300 to-cyan-300">
                    <span className="text-4xl font-semibold text-white">{initials}</span>
                  </div>
                )}
              </div>

              <div className="pb-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-500">
                  {isOwnProfile ? "Your profile" : "Profile"}
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{displayName}</h1>
                <p className="mt-1 text-sm text-slate-500">{profileUser?.email || "@social profile"}</p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  {profileUser?.bio || "Clean, bold, and calm profile layout with your posts, followers, and following summary."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {isOwnProfile ? (
                <button
                  onClick={() => {
                    setEditBio(profileUser?.bio || "");
                    setEditFile(null);
                    setEditFilePreview(profileUser?.profile_image || null);
                    setUpdateError("");
                    setIsEditModalOpen(true);
                  }}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Edit profile
                </button>
              ) : (
                <button
                  onClick={() => navigate("/chat", { state: { startWithUser: profileUser } })}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Message
                </button>
              )}

              <button
                onClick={() => navigate("/search")}
                className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-sky-50"
              >
                Discover people
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <StatCard icon={<Grid3X3 className="h-4 w-4" />} label="Posts" value={posts.length} />
            <div onClick={() => setActiveListModal("followers")} className="cursor-pointer">
              <StatCard icon={<Heart className="h-4 w-4" />} label="Followers" value={followersCount ?? "—"} />
            </div>
            <div onClick={() => setActiveListModal("following")} className="cursor-pointer">
              <StatCard icon={<Users className="h-4 w-4" />} label="Following" value={followingCount} />
            </div>
          </div>
        </div>
      </section>

      <section className="soft-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 border-b border-sky-100/70 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-500">Posts</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Recent posts</h2>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
            <UserRound className="h-3.5 w-3.5" />
            {displayName}
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-sky-100 bg-sky-50/50 text-sm text-slate-500">
            No posts to show yet.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.id}
                className="group overflow-hidden rounded-[28px] border border-sky-100 bg-white shadow-[0_12px_30px_rgba(14,165,233,0.08)] transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(14,165,233,0.14)]"
              >
                <div className="aspect-square bg-gradient-to-br from-sky-50 to-cyan-50">
                  {post.media_url ? (
                    post.media_type && post.media_type.startsWith("video") ? (
                      <video controls className="h-full w-full object-cover">
                        <source src={post.media_url} />
                      </video>
                    ) : (
                      <img src={post.media_url} alt={post.caption || "Post media"} className="h-full w-full object-cover" />
                    )
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.95),rgba(224,242,254,0.85))] px-6 text-center">
                      <p className="text-sm leading-6 text-slate-600">{post.caption || "Text-only post"}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-4">
                  <p className="line-clamp-3 text-sm leading-6 text-slate-700">{post.caption || ""}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{post.created_at ? new Date(post.created_at).toLocaleDateString() : "Recently"}</span>
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 font-medium text-sky-700">Profile post</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md scale-95 transform rounded-[32px] border border-sky-100 bg-white p-6 shadow-[0_20px_50px_rgba(14,165,233,0.15)] transition-all animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-sky-50 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Edit Profile</h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  if (editFilePreview && editFile) {
                    URL.revokeObjectURL(editFilePreview);
                  }
                  setEditFile(null);
                  setEditFilePreview(null);
                }}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
              {/* Profile Pic Upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative h-24 w-24 overflow-hidden rounded-[24px] border-2 border-sky-100 shadow-sm bg-white">
                  {editFilePreview ? (
                    <img src={editFilePreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-400 via-sky-300 to-cyan-300">
                      <span className="text-2xl font-semibold text-white">{initials}</span>
                    </div>
                  )}
                </div>

                <label className="secondary-btn cursor-pointer px-4 py-2 text-xs font-semibold">
                  Change photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setEditFile(file);
                        if (editFilePreview && editFilePreview !== profileUser?.profile_image) {
                          URL.revokeObjectURL(editFilePreview);
                        }
                        setEditFilePreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
              </div>

              {/* Bio Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="input-field w-full rounded-2xl p-3 text-sm resize-none"
                />
              </div>

              {updateError && <p className="text-xs text-rose-500">{updateError}</p>}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    if (editFilePreview && editFile) {
                      URL.revokeObjectURL(editFilePreview);
                    }
                    setEditFile(null);
                    setEditFilePreview(null);
                  }}
                  className="secondary-btn px-4 py-2.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="primary-btn px-5 py-2.5 text-sm"
                >
                  {updatingProfile ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md scale-95 transform rounded-[32px] border border-sky-100 bg-white p-6 shadow-[0_20px_50px_rgba(14,165,233,0.15)] transition-all animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-sky-50 pb-4">
              <h3 className="text-lg font-bold text-slate-900 capitalize">
                {activeListModal}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActiveListModal(null);
                  setListError("");
                }}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {listError && (
              <p className="mt-2 text-xs text-rose-500">{listError}</p>
            )}

            <div className="mt-4 max-h-80 overflow-y-auto pr-1 space-y-3">
              {activeListModal === "followers" ? (
                followersList.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-6">No followers yet.</p>
                ) : (
                  followersList.map((user) => {
                    const isFollowingHim = myFollowingIds.has(user.id);
                    const isMe = currentUser && String(user.id) === String(currentUser.id);
                    return (
                      <div key={user.id} className="flex items-center justify-between rounded-2xl bg-sky-50/40 p-3">
                        <div className="flex items-center gap-3">
                          {user.profile_image ? (
                            <img
                              src={user.profile_image}
                              alt={user.name}
                              className="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 via-sky-300 to-cyan-300 ring-2 ring-white shadow-sm">
                              <span className="text-xs font-semibold text-white">
                                {user.name?.slice(0, 1).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                          </div>
                        </div>

                        {!isMe && currentUser && (
                          <button
                            onClick={() => handleFollowToggleInList(user)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${isFollowingHim
                                ? "bg-slate-200 hover:bg-slate-300 text-slate-700"
                                : "bg-sky-500 hover:bg-sky-600 text-white"
                              }`}
                          >
                            {isFollowingHim ? "Follow" : "Remove"}
                          </button>

                        )}
                      </div>
                    );
                  })
                )
              ) : (
                followingList.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-6">Not following anyone yet.</p>
                ) : (
                  followingList.map((user) => {
                    const isFollowingHim = myFollowingIds.has(user.id);
                    const isMe = currentUser && String(user.id) === String(currentUser.id);
                    return (
                      <div key={user.id} className="flex items-center justify-between rounded-2xl bg-sky-50/40 p-3">
                        <div className="flex items-center gap-3">
                          {user.profile_image ? (
                            <img
                              src={user.profile_image}
                              alt={user.name}
                              className="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 via-sky-300 to-cyan-300 ring-2 ring-white shadow-sm">
                              <span className="text-xs font-semibold text-white">
                                {user.name?.slice(0, 1).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                          </div>
                        </div>

                        {!isMe && currentUser && (
                          <button
                            onClick={() => handleFollowToggleInList(user)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${isFollowingHim
                                ? "bg-slate-200 hover:bg-slate-300 text-slate-700"
                                : "bg-sky-500 hover:bg-sky-600 text-white"
                              }`}
                          >
                            {isFollowingHim ? "Unfollow" : "Follow"}
                          </button>
                        )}
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-[24px] border border-sky-100 bg-white/80 p-4 shadow-[0_10px_24px_rgba(14,165,233,0.06)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">{icon}</div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default Profile;