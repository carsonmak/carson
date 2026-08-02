const jsonHeaders = {
  "content-type": "application/json;charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type,authorization,x-admin-token"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function bearer(request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

async function sha256(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function getUserByToken(env, request) {
  const token = bearer(request);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT users.id, users.username, users.nickname, users.role
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ? AND sessions.expires_at > ?`
  ).bind(token, now()).first();
  return row || null;
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    role: user.role || "user"
  };
}

function isAdmin(env, request, user) {
  const adminToken = env.ADMIN_TOKEN || "";
  const headerToken = request.headers.get("x-admin-token") || "";
  return Boolean((adminToken && headerToken === adminToken) || user?.role === "admin");
}

function configuredAdmin(env) {
  const username = String(env.ADMIN_USERNAME || "").trim();
  const password = String(env.ADMIN_PASSWORD || "");
  if (!username || !password) return null;
  return {
    username,
    password,
    nickname: String(env.ADMIN_NICKNAME || username).trim() || username
  };
}

async function ensureConfiguredAdmin(env) {
  const admin = configuredAdmin(env);
  if (!admin) return null;

  const passwordHash = await sha256(admin.password);
  const existing = await env.DB.prepare("SELECT id, username, nickname, role FROM users WHERE username = ?")
    .bind(admin.username)
    .first();

  if (existing) {
    await env.DB.prepare("UPDATE users SET nickname = ?, password_hash = ?, role = 'admin' WHERE id = ?")
      .bind(admin.nickname, passwordHash, existing.id)
      .run();
    return { id: existing.id, username: admin.username, nickname: admin.nickname, role: "admin" };
  }

  const userId = id("admin");
  await env.DB.prepare(
    "INSERT INTO users (id, username, nickname, password_hash, role, created_at) VALUES (?, ?, ?, ?, 'admin', ?)"
  ).bind(userId, admin.username, admin.nickname, passwordHash, now()).run();
  return { id: userId, username: admin.username, nickname: admin.nickname, role: "admin" };
}

async function identity(env, request, body) {
  const user = await getUserByToken(env, request);
  if (user) {
    return {
      authorId: user.id,
      authorName: user.nickname || user.username,
      authorType: "user"
    };
  }
  return {
    authorId: null,
    authorName: String(body.guestName || "游客").trim() || "游客",
    authorType: "guest"
  };
}

async function handleAuth(env, request, parts) {
  const action = parts[1] || "";

  if (request.method === "GET" && action === "me") {
    const user = await getUserByToken(env, request);
    return json({ user: publicUser(user) });
  }

  if (request.method === "POST" && action === "register") {
    const body = await readBody(request);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const nickname = String(body.nickname || username).trim() || username;
    if (!username || password.length < 4) return json({ error: "用户名不能为空，密码至少 4 位" }, 400);

    const exists = await env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(username).first();
    if (exists) return json({ error: "该用户名已被注册" }, 409);

    const userId = id("user");
    const role = "user";
    await env.DB.prepare(
      "INSERT INTO users (id, username, nickname, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(userId, username, nickname, await sha256(password), role, now()).run();

    const token = id("session");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    await env.DB.prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
      .bind(token, userId, now(), expiresAt)
      .run();

    return json({ token, user: { id: userId, username, nickname, role } });
  }

  if (request.method === "POST" && action === "login") {
    const body = await readBody(request);
    const username = String(body.username || "").trim();
    const admin = configuredAdmin(env);
    let user = null;

    if (admin && username === admin.username && String(body.password || "") === admin.password) {
      user = await ensureConfiguredAdmin(env);
    }

    const passwordHash = await sha256(String(body.password || ""));
    if (!user) {
      user = await env.DB.prepare("SELECT id, username, nickname, role FROM users WHERE username = ? AND password_hash = ?")
        .bind(username, passwordHash)
        .first();
    }
    if (!user) return json({ error: "用户名或密码不正确" }, 401);

    const token = id("session");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    await env.DB.prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
      .bind(token, user.id, now(), expiresAt)
      .run();
    return json({ token, user: publicUser(user) });
  }

  if (request.method === "POST" && action === "logout") {
    const token = bearer(request);
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    return json({ ok: true });
  }

  return json({ error: "接口不存在" }, 404);
}

async function handleFriends(env, request, parts) {
  const user = await getUserByToken(env, request);

  if (request.method === "GET" && parts.length === 1) {
    const rows = await env.DB.prepare("SELECT * FROM friends WHERE status = 'approved' ORDER BY created_at DESC").all();
    return json({ friends: rows.results || [] });
  }

  if (request.method === "POST" && parts.length === 1) {
    const body = await readBody(request);
    const friend = {
      id: id("friend"),
      name: String(body.name || "").trim(),
      url: String(body.url || "").trim(),
      description: String(body.description || "").trim(),
      avatar: String(body.avatar || "").trim(),
      status: "pending"
    };
    if (!friend.name || !friend.url) return json({ error: "站点名称和链接不能为空" }, 400);
    await env.DB.prepare(
      "INSERT INTO friends (id, name, url, description, avatar, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(friend.id, friend.name, friend.url, friend.description, friend.avatar, friend.status, now(), now()).run();
    return json({ friend }, 201);
  }

  if (parts[1] === "admin") {
    if (!isAdmin(env, request, user)) return json({ error: "没有权限" }, 403);

    if (request.method === "GET") {
      const rows = await env.DB.prepare("SELECT * FROM friends ORDER BY created_at DESC").all();
      return json({ friends: rows.results || [] });
    }
  }

  if (parts[1] && ["PATCH", "DELETE"].includes(request.method)) {
    if (!isAdmin(env, request, user)) return json({ error: "没有权限" }, 403);

    if (request.method === "DELETE") {
      await env.DB.prepare("DELETE FROM friends WHERE id = ?").bind(parts[1]).run();
      return json({ ok: true });
    }

    const body = await readBody(request);
    await env.DB.prepare(
      "UPDATE friends SET name = ?, url = ?, description = ?, avatar = ?, status = ?, updated_at = ? WHERE id = ?"
    ).bind(
      String(body.name || "").trim(),
      String(body.url || "").trim(),
      String(body.description || "").trim(),
      String(body.avatar || "").trim(),
      String(body.status || "pending"),
      now(),
      parts[1]
    ).run();
    return json({ ok: true });
  }

  return json({ error: "接口不存在" }, 404);
}

async function handleDiary(env, request, parts) {
  if (request.method === "GET" && parts[1] === "entries") {
    const entries = await env.DB.prepare("SELECT * FROM diary_entries ORDER BY created_at DESC LIMIT 100").all();
    const comments = await env.DB.prepare("SELECT * FROM diary_comments ORDER BY created_at ASC LIMIT 1000").all();
    const grouped = {};
    for (const comment of comments.results || []) {
      grouped[comment.entry_id] = grouped[comment.entry_id] || [];
      grouped[comment.entry_id].push(comment);
    }
    return json({
      entries: (entries.results || []).map((entry) => ({ ...entry, comments: grouped[entry.id] || [] }))
    });
  }

  if (request.method === "POST" && parts[1] === "entries" && parts.length === 2) {
    const body = await readBody(request);
    const author = await identity(env, request, body);
    const entry = {
      id: id("entry"),
      type: "message",
      title: String(body.title || "").trim(),
      content: String(body.content || "").trim()
    };
    if (!entry.title || !entry.content) return json({ error: "标题和内容不能为空" }, 400);
    await env.DB.prepare(
      "INSERT INTO diary_entries (id, type, title, content, author_id, author_name, author_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(entry.id, entry.type, entry.title, entry.content, author.authorId, author.authorName, author.authorType, now()).run();
    return json({ entry: { ...entry, author_id: author.authorId, author_name: author.authorName, author_type: author.authorType, comments: [] } }, 201);
  }

  if (request.method === "POST" && parts[1] === "entries" && parts[3] === "comments") {
    const body = await readBody(request);
    const author = await identity(env, request, body);
    const content = String(body.content || "").trim();
    if (!content) return json({ error: "评论内容不能为空" }, 400);
    const comment = {
      id: id("comment"),
      entry_id: parts[2],
      author_id: author.authorId,
      author_name: author.authorName,
      author_type: author.authorType,
      content,
      created_at: now()
    };
    await env.DB.prepare(
      "INSERT INTO diary_comments (id, entry_id, author_id, author_name, author_type, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(comment.id, comment.entry_id, comment.author_id, comment.author_name, comment.author_type, comment.content, comment.created_at).run();
    return json({ comment }, 201);
  }

  return json({ error: "接口不存在" }, 404);
}

async function handlePostComments(env, request) {
  const url = new URL(request.url);

  if (request.method === "GET") {
    const postId = url.searchParams.get("postId");
    const query = postId
      ? env.DB.prepare("SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at ASC").bind(postId)
      : env.DB.prepare("SELECT * FROM post_comments ORDER BY created_at ASC LIMIT 2000");
    const rows = await query.all();
    const grouped = {};
    for (const row of rows.results || []) {
      grouped[row.post_id] = grouped[row.post_id] || [];
      grouped[row.post_id].push(row);
    }
    return json({ postComments: grouped });
  }

  if (request.method === "POST") {
    const body = await readBody(request);
    const author = await identity(env, request, body);
    const postId = String(body.postId || "").trim();
    const content = String(body.content || "").trim();
    if (!postId || !content) return json({ error: "文章 ID 和评论内容不能为空" }, 400);
    const comment = {
      id: id("post-comment"),
      post_id: postId,
      author_id: author.authorId,
      author_name: author.authorName,
      author_type: author.authorType,
      content,
      created_at: now()
    };
    await env.DB.prepare(
      "INSERT INTO post_comments (id, post_id, author_id, author_name, author_type, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(comment.id, comment.post_id, comment.author_id, comment.author_name, comment.author_type, comment.content, comment.created_at).run();
    return json({ comment }, 201);
  }

  return json({ error: "接口不存在" }, 404);
}

export async function onRequest(context) {
  const { request, env, params } = context;
  if (request.method === "OPTIONS") return new Response(null, { headers: jsonHeaders });
  if (!env.DB) return json({ error: "D1 数据库未绑定，请在 Cloudflare Pages 中绑定 DB" }, 500);

  const parts = Array.isArray(params.path) ? params.path : String(params.path || "").split("/");
  try {
    if (parts[0] === "health") return json({ ok: true, time: now() });
    if (parts[0] === "auth") return handleAuth(env, request, parts);
    if (parts[0] === "friends") return handleFriends(env, request, parts);
    if (parts[0] === "diary") return handleDiary(env, request, parts);
    if (parts[0] === "post-comments") return handlePostComments(env, request);
    return json({ error: "接口不存在" }, 404);
  } catch (error) {
    return json({ error: error.message || "服务器错误" }, 500);
  }
}
