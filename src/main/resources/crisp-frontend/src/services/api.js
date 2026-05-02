import axios from "axios";

function getBackendURL() {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "http://localhost:8080";
  return `http://${host}:8080`;
}

export const BACKEND_URL = getBackendURL();
if (process.env.NODE_ENV === "development") console.log(`🔌 Backend: ${BACKEND_URL}`);

const api = axios.create({ baseURL: BACKEND_URL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("crisp_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      err.friendlyMessage = "Cannot reach the server. Make sure the backend is running on port 8080.";
    } else {
      const d = err.response.data;
      err.friendlyMessage = typeof d === "string" ? d : d?.error || d?.message || `Error ${err.response.status}`;
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login    = (u, p)    => api.post("/api/auth/login",    { username: u, password: p });
export const register = (u, p, f) => api.post("/api/auth/register", { username: u, password: p, fullName: f });

// ── Rooms ─────────────────────────────────────────────────────────────────────
export const getUserRooms   = (u)      => api.get(`/api/rooms/user/${u}`);
export const createRoom     = (body)   => api.post("/api/rooms/create", body);
export const getChatHistory = (id)     => api.get(`/api/rooms/${id}/history`);
export const searchMessages = (id, q)  => api.get(`/api/rooms/${id}/search?q=${encodeURIComponent(q)}`);

// ── Users ─────────────────────────────────────────────────────────────────────
export const getAllUsers      = ()       => api.get("/api/users");
export const getUserStatus    = (u)      => api.get(`/api/users/${u}`);
export const getPublicProfile = (u)      => api.get(`/api/users/${u}/profile`);
export const updateProfile    = (body)   => api.put("/api/users/me", body);
export const blockUser        = (u)      => api.post(`/api/users/${u}/block`);
export const unblockUser      = (u)      => api.delete(`/api/users/${u}/block`);
export const getBlockedUsers  = ()       => api.get("/api/users/me/blocked");

// ── Media ─────────────────────────────────────────────────────────────────────
export const uploadMedia = (file, onProgress) => {
  const form = new FormData(); form.append("file", file);
  return api.post("/api/media/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
  });
};
export const uploadProfilePic = (file) => {
  const form = new FormData(); form.append("file", file);
  return api.post("/api/media/profile-picture", form, { headers: { "Content-Type": "multipart/form-data" } });
};
export const uploadStoryMedia = (file) => {
  const form = new FormData(); form.append("file", file);
  return api.post("/api/media/story", form, { headers: { "Content-Type": "multipart/form-data" } });
};
export const getMediaUrl = (fileId) => fileId ? `${BACKEND_URL}/api/media/${fileId}` : null;

// ── Stories ───────────────────────────────────────────────────────────────────
export const getStories    = ()        => api.get("/api/stories");
export const createStory   = (body)    => api.post("/api/stories", body);
export const markStoryView = (storyId) => api.post(`/api/stories/${storyId}/view`);
export const deleteStory   = (storyId) => api.delete(`/api/stories/${storyId}`);

export default api;
