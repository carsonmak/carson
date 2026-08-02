const CARSON_API_TOKEN_KEY = "carson_api_token_v1";
const CARSON_API_USER_KEY = "carson_api_user_v1";

function apiToken() {
  return localStorage.getItem(CARSON_API_TOKEN_KEY) || "";
}

function saveApiSession(token, user) {
  if (token) localStorage.setItem(CARSON_API_TOKEN_KEY, token);
  if (user) localStorage.setItem(CARSON_API_USER_KEY, JSON.stringify(user));
}

function clearApiSession() {
  localStorage.removeItem(CARSON_API_TOKEN_KEY);
  localStorage.removeItem(CARSON_API_USER_KEY);
}

function cachedApiUser() {
  try {
    return JSON.parse(localStorage.getItem(CARSON_API_USER_KEY) || "null");
  } catch {
    return null;
  }
}

async function apiRequest(path, options = {}) {
  const headers = {
    "content-type": "application/json",
    ...(options.headers || {})
  };
  const token = apiToken();
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(`/api${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "云端接口请求失败");
  return data;
}

window.CarsonAPI = {
  token: apiToken,
  saveSession: saveApiSession,
  clearSession: clearApiSession,
  cachedUser: cachedApiUser,
  request: apiRequest,
  auth: {
    async register(payload) {
      const data = await apiRequest("/auth/register", { method: "POST", body: payload });
      saveApiSession(data.token, data.user);
      return data.user;
    },
    async login(payload) {
      const data = await apiRequest("/auth/login", { method: "POST", body: payload });
      saveApiSession(data.token, data.user);
      return data.user;
    },
    async logout() {
      try {
        await apiRequest("/auth/logout", { method: "POST" });
      } finally {
        clearApiSession();
      }
    },
    async me() {
      const data = await apiRequest("/auth/me");
      if (data.user) saveApiSession(apiToken(), data.user);
      return data.user;
    }
  },
  friends: {
    async list() {
      return (await apiRequest("/friends")).friends || [];
    },
    async submit(friend) {
      return (await apiRequest("/friends", { method: "POST", body: friend })).friend;
    }
  },
  diary: {
    async list() {
      return (await apiRequest("/diary/entries")).entries || [];
    },
    async create(entry) {
      return (await apiRequest("/diary/entries", { method: "POST", body: entry })).entry;
    },
    async comment(entryId, payload) {
      return (await apiRequest(`/diary/entries/${entryId}/comments`, { method: "POST", body: payload })).comment;
    }
  },
  postComments: {
    async list(postId = "") {
      const suffix = postId ? `?postId=${encodeURIComponent(postId)}` : "";
      return (await apiRequest(`/post-comments${suffix}`)).postComments || {};
    },
    async create(payload) {
      return (await apiRequest("/post-comments", { method: "POST", body: payload })).comment;
    }
  }
};
