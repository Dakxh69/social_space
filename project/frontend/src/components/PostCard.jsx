import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { createComment, getComments, deleteComment, updateComment } from "../services/postService";
import { searchUsers } from "../services/userService";


const getProfileImage = (user) => {
  const img = user?.profile_image;
  if (!img || img === "None" || img === "null" || img === "undefined" || (typeof img === "string" && img.trim() === "")) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "User")}&background=e0f2fe&color=0369a1`;
  }
  return img;
};

function PostCard({ post, onDelete, deleting, onToggleLike, liking }) {
  const currentUser = useSelector((state) => state.auth.user);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [localComments, setLocalComments] = useState([]);
  const [commentCount, setCommentCount] = useState(0);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState("");

  // Refs so the polling interval always reads latest values without stale closures
  const commentOpenRef = useRef(commentOpen);
  const localCommentsRef = useRef(localComments);
  useEffect(() => { commentOpenRef.current = commentOpen; }, [commentOpen]);
  useEffect(() => { localCommentsRef.current = localComments; }, [localComments]);

  const isOwner = currentUser && post.user && currentUser.id === post.user.id;
  const isLiked = Boolean(post.is_liked);
  const likesCount = post.likes_count ?? 0;
  const isOptimisticPost = String(post.id).startsWith("temp-");

  useEffect(() => {
    const loadComments = async () => {
      setCommentsLoading(true);
      try {
        const data = await getComments(post.id);
        const comments = await Promise.all(
          (data?.comments || []).map(async (comment) => {
            let profileImg = null;
            if (currentUser && String(comment.user_id) === String(currentUser.id)) {
              profileImg = currentUser.profile_image;
            } else if (post.user && String(comment.user_id) === String(post.user.id)) {
              profileImg = post.user.profile_image;
            } else {
              try {
                const results = await searchUsers(comment.username);
                const matched = (results || []).find((u) => String(u.id) === String(comment.user_id));
                if (matched) {
                  profileImg = matched.profile_image;
                }
              } catch (err) {
                console.error("Failed to load profile image for commenter", comment.username, err);
              }
            }

            return {
              id: comment.id,
              content: comment.content,
              created_at: comment.created_at,
              user: {
                id: comment.user_id,
                name: comment.username,
                profile_image: profileImg,
              },
            };
          })
        );

        setLocalComments(comments);
        setCommentCount(data?.count ?? comments.length);
      } catch (err) {
        console.error("Failed to load comments", err);
        setCommentError(err?.response?.data?.detail || "Failed to load comments");
      } finally {
        setCommentsLoading(false);
      }
    };

    loadComments();
  }, [post.id, currentUser, post.user]);

  // Re-fetch immediately every time the user opens the comment section
  // This ensures comments posted by others after page load are always visible
  useEffect(() => {
    if (!commentOpen || isOptimisticPost) return;

    const fetchLatest = async () => {
      try {
        const data = await getComments(post.id);
        const serverCount = data?.count ?? (data?.comments?.length ?? 0);
        setCommentCount(serverCount);

        const refreshed = (data?.comments || []).map((comment) => {
          // Reuse cached profile image if we already have it
          const existing = localCommentsRef.current.find(
            (c) => String(c.id) === String(comment.id)
          );
          const profileImg =
            existing?.user?.profile_image ??
            (currentUser && String(comment.user_id) === String(currentUser.id)
              ? currentUser.profile_image
              : post.user && String(comment.user_id) === String(post.user.id)
              ? post.user.profile_image
              : null);
          return {
            id: comment.id,
            content: comment.content,
            created_at: comment.created_at,
            user: { id: comment.user_id, name: comment.username, profile_image: profileImg },
          };
        });
        setLocalComments(refreshed);
      } catch {
        // silent fail
      }
    };

    fetchLatest();
  }, [commentOpen, post.id, isOptimisticPost, currentUser, post.user]);

  // Silently poll every 20s to pick up comments/count from other users
  useEffect(() => {
    if (isOptimisticPost) return;

    const interval = setInterval(async () => {
      try {
        const data = await getComments(post.id);
        const serverCount = data?.count ?? (data?.comments?.length ?? 0);

        // Always update the count on the button
        setCommentCount(serverCount);

        // Only refresh the full list if the section is currently open
        if (commentOpenRef.current) {
          const refreshed = (data?.comments || []).map((comment) => {
            // Reuse already-fetched profile image to avoid extra searchUsers calls
            const existing = localCommentsRef.current.find(
              (c) => String(c.id) === String(comment.id)
            );
            const profileImg =
              existing?.user?.profile_image ??
              (currentUser && String(comment.user_id) === String(currentUser.id)
                ? currentUser.profile_image
                : post.user && String(comment.user_id) === String(post.user.id)
                ? post.user.profile_image
                : null);
            return {
              id: comment.id,
              content: comment.content,
              created_at: comment.created_at,
              user: { id: comment.user_id, name: comment.username, profile_image: profileImg },
            };
          });
          setLocalComments(refreshed);
        }
      } catch {
        // Silent fail — do not disrupt the user
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [post.id, isOptimisticPost, currentUser, post.user]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();

    const content = commentText.trim();
    if (!content) {
      setCommentError("Write a comment first");
      return;
    }

    if (isOptimisticPost) {
      setCommentError("Wait for the post to finish saving before commenting");
      return;
    }

    setCommentError("");
    setCommentLoading(true);

    try {
      const result = await createComment(post.id, content);
      setLocalComments((prev) => [
        ...prev,
        {
          id: result?.comment_id || `temp-${Date.now()}`,
          content: result?.content || content,
          user: {
            id: currentUser?.id,
            name: currentUser?.name || "You",
            profile_image: currentUser?.profile_image || null,
          },
          created_at: new Date().toISOString(),
        },
      ]);
      setCommentCount((prev) => prev + 1);
      setCommentText("");
      setCommentOpen(true);
    } catch (err) {
      console.error("Failed to create comment", err);
      setCommentError(err?.response?.data?.detail || "Failed to post comment");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleCommentDelete = async (commentId) => {
    try {
      await deleteComment(commentId);
      setLocalComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to delete comment", err);
      setCommentError(err?.response?.data?.detail || "Failed to delete comment");
    }
  };

  const handleCommentUpdate = async (commentId) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      setCommentError("Comment content cannot be empty");
      return;
    }
    try {
      await updateComment(commentId, trimmed);
      setLocalComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content: trimmed } : c))
      );
      setEditingCommentId(null);
      setEditingText("");
    } catch (err) {
      console.error("Failed to update comment", err);
      setCommentError(err?.response?.data?.detail || "Failed to update comment");
    }
  };

  return (
    <article className="soft-card mb-5 overflow-hidden p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <img
          src={getProfileImage(post.user)}
          alt={post.user?.name || "User"}
          className="h-12 w-12 rounded-full object-cover"
        />

        <div>
          <h4 className="text-sm font-semibold text-slate-900">{post.user?.name || 'Unknown'}</h4>
          <small className="text-xs text-slate-500">{new Date(post.created_at).toLocaleString()}</small>
        </div>
      </div>

      <p className="text-sm leading-7 text-slate-700 sm:text-[15px]">{post.caption}</p>

      {post.media_url && (
        <div className="mt-4">
          {post.media_type && post.media_type.startsWith('video') ? (
            <video controls className="w-full rounded-[12px]">
              <source src={post.media_url} />
            </video>
          ) : (
            <img src={post.media_url} alt="post media" className="w-full rounded-[12px] object-cover" />
          )}
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <button
          onClick={() => onToggleLike && onToggleLike(post)}
          disabled={liking}
          className={`secondary-btn px-4 py-2 text-sm ${isLiked ? "bg-rose-50 text-rose-600" : ""}`}
        >
          {liking ? "Updating..." : isLiked ? "💖 Liked" : "❤️ Like"} ({likesCount})
        </button>
        <button
          type="button"
          onClick={() => setCommentOpen((prev) => !prev)}
          disabled={isOptimisticPost}
          className="secondary-btn px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          💬 Comment ({commentCount})
        </button>
        {isOwner && (
          <button onClick={() => onDelete && onDelete(post.id)} disabled={deleting} className="secondary-btn px-4 py-2 text-sm">
            {deleting ? "Deleting..." : "🗑️ Delete"}
          </button>
        )}
      </div>

      {commentOpen && (
        <div className="mt-4 space-y-4 border-t border-sky-100 pt-4">
          {commentsLoading && <p className="text-sm text-slate-500">Loading comments...</p>}

          <form onSubmit={handleCommentSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              type="text"
              placeholder="Write a comment..."
              className="input-field flex-1 rounded-full px-4 py-3 text-sm"
            />
            <button
              type="submit"
              disabled={commentLoading || isOptimisticPost}
              className="rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isOptimisticPost ? "Saving post..." : commentLoading ? "Posting..." : "Send"}
            </button>
          </form>

          {isOptimisticPost && (
            <p className="text-sm text-slate-500">Comments are available after the post is saved by the server.</p>
          )}

          {commentError && <p className="text-sm text-rose-600">{commentError}</p>}

          {localComments.length > 0 && (
            <div className="space-y-3">
              {localComments.map((comment) => {
                const canDelete = currentUser && (
                  String(comment.user?.id) === String(currentUser.id) ||
                  String(post.user?.id) === String(currentUser.id)
                );
                const canEdit = currentUser && String(comment.user?.id) === String(currentUser.id);
                const isEditing = editingCommentId === comment.id;

                return (
                  <div key={comment.id} className="flex items-start gap-3 rounded-2xl bg-sky-50/60 p-3 relative group">
                    <img
                      src={getProfileImage(comment.user)}
                      alt={comment.user?.name || "User"}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{comment.user?.name || "You"}</p>
                      {isEditing ? (
                        <div className="mt-1 flex flex-col gap-2">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="input-field py-1.5 px-3 text-sm rounded-xl"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCommentUpdate(comment.id)}
                              className="text-xs bg-sky-500 hover:bg-sky-600 text-white rounded-lg px-2.5 py-1 font-semibold transition"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditingText("");
                              }}
                              className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg px-2.5 py-1 font-semibold transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600 break-words">{comment.content}</p>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1.5">
                        {canEdit && (
                          <button
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditingText(comment.content);
                            }}
                            className="text-xs text-slate-500 hover:text-slate-700 opacity-60 hover:opacity-100 transition p-1"
                            title="Edit Comment"
                          >
                            ✏️
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleCommentDelete(comment.id)}
                            className="text-xs text-rose-500 hover:text-rose-700 opacity-60 hover:opacity-100 transition p-1"
                            title="Delete Comment"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default PostCard;