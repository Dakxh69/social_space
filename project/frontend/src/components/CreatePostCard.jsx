import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { createPost } from "../services/postService";

function CreatePostCard({ onCreated, onOptimisticAdd, onOptimisticFail }) {
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const currentUser = useSelector((state) => state.auth.user);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!caption.trim() && !file) {
      setError("Write something or choose a file to post");
      return;
    }

    setError(null);

    setLoading(true);
    try {
      const result = await createPost(caption, file);
      if (onOptimisticAdd) {
        onOptimisticAdd({
          id: result?.post_id,
          caption: result?.caption ?? caption,
          media_url: result?.media_url ?? null,
          media_type: file?.type || (file ? "image" : null),
          created_at: new Date().toISOString(),
          likes_count: 0,
          is_liked: false,
          user: currentUser
            ? {
                id: currentUser.id,
                name: currentUser.name,
                profile_image: currentUser.profile_image,
              }
            : { id: null, name: "You", profile_image: null },
        });
      }
      setCaption("");
      setFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (onCreated) onCreated();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.detail || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="soft-card mb-5 p-5 sm:p-6">
      <div className="flex items-center gap-4">
        {currentUser?.profile_image ? (
          <img
            src={currentUser.profile_image}
            alt={currentUser?.name || "User"}
            className="h-12 w-12 rounded-full object-cover ring-4 ring-sky-50 shadow-md shadow-sky-200/40"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-300 via-sky-200 to-cyan-300 ring-4 ring-sky-50 shadow-md shadow-sky-200/40">
            <span className="text-sm font-semibold text-slate-700">
              {currentUser?.name ? currentUser.name.slice(0, 1).toUpperCase() : "U"}
            </span>
          </div>
        )}

        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          type="text"
          placeholder="What's on your mind?"
          className="input-field flex-1 rounded-full px-5 py-4 text-[15px]"
        />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files[0] || null;
              setFile(selected);
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="secondary-btn px-4 py-2 text-sm"
          >
            📎 Choose file
          </button>

          <p className="truncate text-sm text-slate-500">
            {file ? file.name : "No file selected"}
          </p>

          {file && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="ml-auto text-xs text-rose-500 hover:text-rose-700 transition"
              title="Remove file"
            >
              ✕ Remove
            </button>
          )}
        </div>

        {previewUrl && file?.type?.startsWith("image/") && (
          <div className="overflow-hidden rounded-2xl border border-sky-100 shadow-sm">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-72 w-full object-cover"
            />
          </div>
        )}

        {previewUrl && file?.type?.startsWith("video/") && (
          <div className="overflow-hidden rounded-2xl border border-sky-100 shadow-sm">
            <video
              src={previewUrl}
              controls
              className="max-h-72 w-full rounded-2xl"
            />
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex justify-end">
        <button disabled={loading} className="primary-btn px-5 py-2.5">
          {loading ? "Posting..." : "Create Post"}
        </button>
      </div>
    </form>
  );
}

export default CreatePostCard;