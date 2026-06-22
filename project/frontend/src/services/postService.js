import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
  withCredentials: true,
});

export const createPost = async (caption, mediaFile) => {
  const formData = new FormData();
  formData.append("caption", caption || "");

  if (mediaFile) {
    formData.append("media", mediaFile);
  }

  const res = await API.post("/posts/create", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
};

export const getFeed = async (page = 1, limit = 10) => {
  const res = await API.get(`/posts/feed?page=${page}&limit=${limit}`);
  return res.data;
};

export const getMyPosts = async () => {
  const res = await API.get(`/posts/my-posts`);
  return res.data;
};

export const getPostById = async (postId) => {
  const res = await API.get(`/posts/${postId}`);
  return res.data;
};

export const deletePost = async (postId) => {
  const res = await API.delete(`/posts/${postId}`);
  return res.data;
};

export const likePost = async (postId) => {
  const res = await API.post(`/posts/${postId}/like`);
  return res.data;
};

export const unlikePost = async (postId) => {
  const res = await API.delete(`/posts/${postId}/like`);
  return res.data;
};

export const createComment = async (postId, content) => {
  const res = await API.post(`/posts/${postId}/comments`, { content });
  return res.data;
};

export const getComments = async (postId) => {
  const res = await API.get(`/posts/${postId}/comments`);
  return res.data;
};

export const deleteComment = async (commentId) => {
  const res = await API.delete(`/posts/comments/${commentId}`);
  return res.data;
};

export const updateComment = async (commentId, content) => {
  const res = await API.put(`/posts/comments/${commentId}`, { content });
  return res.data;
};


