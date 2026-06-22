import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
  withCredentials: true,
});

export const searchUsers = async (query) => {
  const res = await API.get(`/users/search?q=${encodeURIComponent(query)}`);
  return res.data;
};

export const followUser = async (userId) => {
  const res = await API.post(`/users/${userId}/follow`);
  return res.data;
};

export const unfollowUser = async (userId) => {
  const res = await API.delete(`/users/${userId}/unfollow`);
  return res.data;
};

export const getFollowing = async (userId) => {
  const res = await API.get(`/users/${userId}/following`);
  return res.data;
};

export const getFollowers = async (userId) => {
  const res = await API.get(`/users/${userId}/followers`);
  return res.data;
};

export const updateProfile = async (bio, profileImageFile) => {
  const formData = new FormData();
  if (bio !== undefined && bio !== null) {
    formData.append("bio", bio);
  }
  if (profileImageFile) {
    formData.append("profile_image", profileImageFile);
  }
  const res = await API.put("/users/profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const getUserById = async (userId) => {
  const res = await API.get(`/users/${userId}`);
  return res.data;
};

