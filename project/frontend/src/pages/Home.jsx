import { useEffect, useRef, useState } from "react";
import CreatePostCard from "../components/CreatePostCard";
import StoryBar from "../components/StoryBar";
import PostCard from "../components/PostCard";
import { getFeed, deletePost, getMyPosts, likePost, unlikePost } from "../services/postService";
import { useSelector } from "react-redux";

function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingIds, setDeletingIds] = useState([]);
  const [likingIds, setLikingIds] = useState([]);
  const [fallbackMessage, setFallbackMessage] = useState("");
  const currentUser = useSelector((state) => state.auth.user);

  const loadFeed = async () => {
    setLoading(true);
    try {
      const data = await getFeed(1, 20);
      setPosts(data || []);
      setFallbackMessage("");
    } catch (err) {
      console.error("Failed to load feed", err);
      // Try fallback: get the user's own posts (safer route)
      try {
        const my = await getMyPosts();
        // augment with current user info so UI can render user fields
        const augmented = (my || []).map((p) => ({
          ...p,
          user: currentUser ? { id: currentUser.id, name: currentUser.name, profile_image: currentUser.profile_image } : { id: null, name: "You", profile_image: null },
          likes_count: p.likes_count ?? 0,
          is_liked: p.is_liked ?? false,
        }));
        setPosts(augmented);
        setFallbackMessage("Feed unavailable — showing your posts only (fallback)");
      } catch (err2) {
        console.error("Fallback load failed", err2);
        setPosts([]);
        setFallbackMessage("Feed currently unavailable");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOptimisticAdd = (tempPost) => {
    setPosts((prev) => [tempPost, ...prev]);
  };

  const handleOptimisticFail = (tempId) => {
    setPosts((prev) => prev.filter((p) => String(p.id) !== String(tempId)));
  };

  const handleDelete = async (postId) => {
    // optimistic remove
    const prev = posts;
    setPosts((p) => p.filter((x) => String(x.id) !== String(postId)));
    setDeletingIds((ids) => [...ids, postId]);

    try {
      await deletePost(postId);
    } catch (err) {
      console.error("Delete failed", err);
      setPosts(prev);
    } finally {
      setDeletingIds((ids) => ids.filter((id) => String(id) !== String(postId)));
    }
  };

  const handleToggleLike = async (post) => {
    const postId = post.id;
    const wasLiked = Boolean(post.is_liked);

    setLikingIds((ids) => [...ids, postId]);
    // Optimistic update — show change immediately
    setPosts((prev) =>
      prev.map((item) =>
        String(item.id) === String(postId)
          ? {
              ...item,
              is_liked: !wasLiked,
              likes_count: Math.max(0, (item.likes_count ?? 0) + (wasLiked ? -1 : 1)),
            }
          : item
      )
    );

    try {
      if (wasLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }

      // After API confirms, re-fetch the feed to sync accurate like counts from server
      // (same as comment on-open re-fetch, but triggered by the like action)
      try {
        const data = await getFeed(1, 20);
        if (data) {
          setPosts((prev) => {
            const optimistic = prev.filter((p) => String(p.id).startsWith("temp-"));
            const merged = data.map((serverPost) => {
              // Preserve local state for any other post currently being liked
              const currentlyLiking = likingIdsRef.current
                .filter((id) => String(id) !== String(postId)) // exclude the one we just finished
                .includes(serverPost.id);
              if (currentlyLiking) {
                const local = prev.find((p) => String(p.id) === String(serverPost.id));
                return local || serverPost;
              }
              return serverPost;
            });
            return [...optimistic, ...merged];
          });
        }
      } catch {
        // silent — optimistic count is already correct
      }
    } catch (err) {
      console.error("Like toggle failed", err);
      // Rollback optimistic update on error
      setPosts((prev) =>
        prev.map((item) =>
          String(item.id) === String(postId)
            ? {
                ...item,
                is_liked: wasLiked,
                likes_count: Math.max(0, (item.likes_count ?? 0) + (wasLiked ? 1 : -1)),
              }
            : item
        )
      );
    } finally {
      setLikingIds((ids) => ids.filter((id) => String(id) !== String(postId)));
    }
  };


  // Track which post IDs are currently being liked so the poll doesn't overwrite optimistic state
  const likingIdsRef = useRef([]);
  useEffect(() => {
    likingIdsRef.current = likingIds;
  }, [likingIds]);

  // Initial load
  useEffect(() => {
    loadFeed();
  }, []);

  // Background polling — silently re-fetch every 15s to pick up others' likes & comments
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await getFeed(1, 20);
        if (!data) return;

        setPosts((prev) => {
          // Keep any optimistic (still-uploading) posts
          const optimistic = prev.filter((p) => String(p.id).startsWith("temp-"));

          // For real posts, prefer server data but keep optimistic like state
          // for any post the user is currently toggling
          const merged = (data || []).map((serverPost) => {
            const currentlyLiking = likingIdsRef.current.includes(serverPost.id);
            if (currentlyLiking) {
              // Don't overwrite — keep existing local state for this post
              const local = prev.find((p) => String(p.id) === String(serverPost.id));
              return local || serverPost;
            }
            return serverPost;
          });

          return [...optimistic, ...merged];
        });
      } catch {
        // Silent fail — do not disrupt the user if the poll fails
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div className="soft-card premium-outline relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.24),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.14),transparent_30%)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-500">Feed</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Your calm blue social space</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          Share updates, explore stories, and chat in a cleaner interface designed to feel light and modern.
        </p>
      </div>

      <CreatePostCard onCreated={loadFeed} onOptimisticAdd={handleOptimisticAdd} onOptimisticFail={handleOptimisticFail} />

      <StoryBar />

      <div className="space-y-0">
        {loading ? (
          <p className="p-4">Loading feed...</p>
        ) : (
          posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              onDelete={handleDelete}
              onToggleLike={handleToggleLike}
              deleting={deletingIds.includes(p.id)}
              liking={likingIds.includes(p.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default Home;