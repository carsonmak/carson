const SOCIAL_KEY = "personal_blog_social_v1";
const $ = (selector) => document.querySelector(selector);

let activeFilter = "all";
let socialCache = readSocial();

function readSocial() {
  try {
    return JSON.parse(localStorage.getItem(SOCIAL_KEY) || '{"entries":[],"postComments":{}}');
  } catch {
    return { entries: [], postComments: {} };
  }
}

function saveSocial(data) {
  socialCache = data;
  localStorage.setItem(SOCIAL_KEY, JSON.stringify(data, null, 2));
}

function normalizeEntry(entry) {
  return {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    content: entry.content,
    authorId: entry.authorId || entry.author_id,
    authorName: entry.authorName || entry.author_name,
    authorType: entry.authorType || entry.author_type,
    createdAt: entry.createdAt || entry.created_at,
    comments: (entry.comments || []).map((comment) => ({
      id: comment.id,
      authorId: comment.authorId || comment.author_id,
      authorName: comment.authorName || comment.author_name,
      authorType: comment.authorType || comment.author_type,
      content: comment.content,
      createdAt: comment.createdAt || comment.created_at
    }))
  };
}

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[char];
  });
}

function formatTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function renderIdentity() {
  const user = window.BlogAuth.currentUser();
  $("#identityText").textContent = user
    ? `当前以用户身份发布：${user.nickname || user.username}`
    : "当前以游客身份发布，可填写游客昵称。";
  document.querySelector(".guest-name-field").style.display = user ? "none" : "grid";
  $("#logoutButton").style.display = user ? "inline-flex" : "none";
}

function entryTypeText(type) {
  return "留言";
}

function renderCommentList(comments = []) {
  if (!comments.length) return `<div class="empty-inline">还没有评论。</div>`;
  return comments
    .map(
      (comment) => `
        <article class="comment-item">
          <div class="comment-meta">
            <strong>${escapeHtml(comment.authorName)}</strong>
            <span>${comment.authorType === "user" ? "用户" : "游客"}</span>
            <span>${formatTime(comment.createdAt)}</span>
          </div>
          <p>${escapeHtml(comment.content)}</p>
        </article>
      `
    )
    .join("");
}

function renderEntries() {
  const social = socialCache;
  const user = window.BlogAuth.currentUser();
  const entries = social.entries
    .filter((entry) => activeFilter === "all" || entry.type === activeFilter)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  $("#diaryList").innerHTML = entries.length
    ? entries
        .map(
          (entry) => `
            <article class="diary-card">
              <div class="post-meta">
                <span>${entryTypeText(entry.type)}</span>
                <span>${entry.authorType === "user" ? "用户" : "游客"}：${escapeHtml(entry.authorName)}</span>
                <span>${formatTime(entry.createdAt)}</span>
              </div>
              <h2>${escapeHtml(entry.title)}</h2>
              <p>${escapeHtml(entry.content)}</p>
              <section class="comment-box">
                <h3>评论</h3>
                <div class="comment-list">${renderCommentList(entry.comments || [])}</div>
                <form class="inline-comment-form" data-entry-comment="${entry.id}">
                  <label class="guest-comment-name" style="${user ? "display:none" : ""}">游客昵称<input name="guestName" placeholder="游客" /></label>
                  <label>评论内容<textarea name="content" required rows="2" placeholder="写下你的评论"></textarea></label>
                  <button class="ghost-button" type="submit">发表评论</button>
                </form>
              </section>
            </article>
          `
        )
        .join("")
    : `<article class="empty-card">暂无内容，来发布第一条吧。</article>`;
}

$("#diaryForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const identity = window.BlogAuth.publicIdentity(form.elements.guestName.value);
  const social = readSocial();

  const entryPayload = {
    id: `entry-${Date.now()}`,
    type: "message",
    title: form.elements.title.value.trim(),
    content: form.elements.content.value.trim(),
    authorId: identity.id,
    authorName: identity.name,
    authorType: identity.type,
    createdAt: new Date().toISOString(),
    comments: []
  };

  if (window.CarsonAPI) {
    try {
      const cloudEntry = await window.CarsonAPI.diary.create({
        type: entryPayload.type,
        title: entryPayload.title,
        content: entryPayload.content,
        guestName: form.elements.guestName.value
      });
      social.entries.unshift(normalizeEntry(cloudEntry));
    } catch (error) {
      console.warn("云端留言发布不可用，保存到本地：", error.message);
      social.entries.unshift(entryPayload);
    }
  } else {
    social.entries.unshift(entryPayload);
  }

  saveSocial(social);
  form.reset();
  renderEntries();
  showToast("发布成功");
});

$("#diaryFilters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
  renderEntries();
});

$("#diaryList").addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-entry-comment]");
  if (!form) return;
  event.preventDefault();

  const social = readSocial();
  const entry = social.entries.find((item) => item.id === form.dataset.entryComment);
  if (!entry) return;

  const identity = window.BlogAuth.publicIdentity(form.elements.guestName?.value || "");
  entry.comments = entry.comments || [];
  const commentPayload = {
    id: `comment-${Date.now()}`,
    authorId: identity.id,
    authorName: identity.name,
    authorType: identity.type,
    content: form.elements.content.value.trim(),
    createdAt: new Date().toISOString()
  };

  if (window.CarsonAPI) {
    try {
      const cloudComment = await window.CarsonAPI.diary.comment(entry.id, {
        content: commentPayload.content,
        guestName: form.elements.guestName?.value || ""
      });
      entry.comments.push({
        id: cloudComment.id,
        authorId: cloudComment.author_id,
        authorName: cloudComment.author_name,
        authorType: cloudComment.author_type,
        content: cloudComment.content,
        createdAt: cloudComment.created_at
      });
    } catch (error) {
      console.warn("云端留言评论不可用，保存到本地：", error.message);
      entry.comments.push(commentPayload);
    }
  } else {
    entry.comments.push(commentPayload);
  }

  saveSocial(social);
  renderEntries();
  showToast("评论已发布");
});

$("#logoutButton").addEventListener("click", () => {
  window.BlogAuth.logout();
  renderIdentity();
  renderEntries();
  showToast("已退出登录");
});

renderIdentity();
renderEntries();

if (window.CarsonAPI) {
  window.CarsonAPI.diary
    .list()
    .then((entries) => {
      saveSocial({ ...socialCache, entries: entries.map(normalizeEntry) });
      renderEntries();
    })
    .catch((error) => console.warn("云端留言读取不可用，使用本地数据：", error.message));
}
