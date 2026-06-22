import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
  withCredentials: true,
});

export const registerUser = async (formData) => {
  const response = await API.post(
    "/auth/register",
    formData
  );

  return response.data;
};

export const loginUser = async (data) => {
  const response = await API.post(
    "/auth/login",
    data
  );

  return response.data;
};

export const logoutUser = async () => {
  const response = await API.post(
    "/auth/logout"
  );

  return response.data;
};

export const getCurrentUser = async () => {
  const response = await API.get(
    "/auth/me"
  );

  return response.data;
};

export const getAllUsers = async () => {
  const response = await API.get("/auth/users");
  return response.data;
};