import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
  withCredentials: true,
});

export const getConversations = async () => {
  const res = await API.get("/chat/conversations");
  return res.data;
};

export const startConversation = async (userId) => {
  const res = await API.post(`/chat/start/${userId}`);
  return res.data;
};

export const getMessages = async (conversationId) => {
  const res = await API.get(`/chat/${conversationId}/messages`);
  return res.data;
};

export const sendMessage = async (conversationId, content) => {
  const res = await API.post(`/chat/${conversationId}/message`, { content });
  return res.data;
};

export const markConversationAsRead = async (conversationId) => {
  const res = await API.patch(`/chat/${conversationId}/read`);
  return res.data;
};

