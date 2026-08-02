const BLOG_USER_KEY = "personal_blog_users_v1";
const BLOG_SESSION_KEY = "personal_blog_session_v1";

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(BLOG_USER_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(BLOG_USER_KEY, JSON.stringify(users, null, 2));
}

function encodePassword(password) {
  return btoa(unescape(encodeURIComponent(password)));
}

function currentUser() {
  const apiUser = window.CarsonAPI?.cachedUser?.();
  if (apiUser) return apiUser;

  const userId = localStorage.getItem(BLOG_SESSION_KEY);
  if (!userId) return null;
  return readUsers().find((user) => user.id === userId) || null;
}

function publicIdentity(guestName = "") {
  const user = currentUser();
  if (user) {
    return {
      id: user.id,
      name: user.nickname || user.username,
      type: "user"
    };
  }

  return {
    id: `guest-${Date.now()}`,
    name: guestName.trim() || "游客",
    type: "guest"
  };
}

window.BlogAuth = {
  currentUser,
  publicIdentity,
  displayName() {
    const user = currentUser();
    return user ? user.nickname || user.username : "游客";
  },
  async register({ username, password, nickname }) {
    if (window.CarsonAPI) {
      try {
        return await window.CarsonAPI.auth.register({ username, password, nickname });
      } catch (error) {
        console.warn("云端注册不可用，使用本地注册模式：", error.message);
      }
    }

    const cleanUsername = username.trim();
    if (!cleanUsername || password.length < 4) {
      throw new Error("用户名不能为空，密码至少 4 位");
    }

    const users = readUsers();
    if (users.some((user) => user.username === cleanUsername)) {
      throw new Error("该用户名已被注册");
    }

    const user = {
      id: `user-${Date.now()}`,
      username: cleanUsername,
      nickname: nickname.trim() || cleanUsername,
      password: encodePassword(password),
      createdAt: new Date().toISOString()
    };

    users.push(user);
    saveUsers(users);
    localStorage.setItem(BLOG_SESSION_KEY, user.id);
    return user;
  },
  async login({ username, password }) {
    if (window.CarsonAPI) {
      try {
        return await window.CarsonAPI.auth.login({ username, password });
      } catch (error) {
        console.warn("云端登录不可用，尝试本地登录模式：", error.message);
      }
    }

    const encoded = encodePassword(password);
    const user = readUsers().find((item) => item.username === username.trim() && item.password === encoded);
    if (!user) throw new Error("用户名或密码不正确");
    localStorage.setItem(BLOG_SESSION_KEY, user.id);
    return user;
  },
  async logout() {
    if (window.CarsonAPI) {
      await window.CarsonAPI.auth.logout().catch(() => window.CarsonAPI.clearSession());
    }
    localStorage.removeItem(BLOG_SESSION_KEY);
  }
};
