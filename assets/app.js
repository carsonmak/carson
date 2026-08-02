const STORAGE_KEY = "personal_blog_data_v1";
const THEME_KEY = "personal_blog_theme";
const SOCIAL_KEY = "personal_blog_social_v1";

const $ = (selector) => document.querySelector(selector);

const cloneDefaultData = () => structuredClone(window.BLOG_DEFAULT_DATA);

const normalizeData = (data) => {
  const defaults = cloneDefaultData();
  return {
    ...defaults,
    ...data,
    site: { ...defaults.site, ...(data.site || {}) },
    posts: Array.isArray(data.posts) ? data.posts : defaults.posts,
    friends: Array.isArray(data.friends) ? data.friends : defaults.friends
  };
};

const readData = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return cloneDefaultData();

  try {
    return normalizeData(JSON.parse(saved));
  } catch {
    return cloneDefaultData();
  }
};

const formatDate = (date) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(date));
};

const formatTime = (date) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
};

const readSocial = () => {
  try {
    return JSON.parse(localStorage.getItem(SOCIAL_KEY) || '{"entries":[],"postComments":{}}');
  } catch {
    return { entries: [], postComments: {} };
  }
};

let state = {
  data: readData(),
  activeTag: "全部",
  activePostId: "",
  social: readSocial()
};

const saveSocial = (social) => {
  state.social = social;
  localStorage.setItem(SOCIAL_KEY, JSON.stringify(social, null, 2));
};

const normalizePostComment = (comment) => ({
  id: comment.id,
  authorId: comment.authorId || comment.author_id,
  authorName: comment.authorName || comment.author_name,
  authorType: comment.authorType || comment.author_type,
  content: comment.content,
  createdAt: comment.createdAt || comment.created_at
});

const escapeHtml = (value = "") =>
  value.replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[char];
  });

const applySite = () => {
  const { site, posts } = state.data;
  document.title = site.title || "个人博客";
  document.documentElement.style.setProperty("--accent", site.accent || "#0f766e");
  $("#siteCover").style.backgroundImage = `url("${site.cover}")`;
  $("#siteAvatar").src = site.avatar;
  $("#mobileAvatar").src = site.avatar;
  $("#siteTitle").textContent = site.title;
  $("#mobileTitle").textContent = site.title;
  $("#siteSubtitle").textContent = site.subtitle;
  $("#siteAuthor").textContent = site.author;
  $("#siteLocation").textContent = site.location;
  $("#siteFooter").textContent = site.footer;
  $("#postCount").textContent = `${posts.length} 条动态`;
};

const getTags = () => {
  const tags = state.data.posts.flatMap((post) => post.tags || []);
  return ["全部", ...Array.from(new Set(tags))];
};

const renderTags = () => {
  $("#tags").innerHTML = getTags()
    .map((tag) => `<button class="tag ${state.activeTag === tag ? "active" : ""}" type="button" data-tag="${tag}"># ${tag}</button>`)
    .join("");
};

const renderPosts = () => {
  const social = state.social;
  const filtered = state.data.posts
    .filter((post) => state.activeTag === "全部" || post.tags?.includes(state.activeTag))
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.date) - new Date(a.date));

  $("#feedList").innerHTML = filtered
    .map((post, index) => {
      const tags = (post.tags || []).map((tag) => `<span class="post-tag"># ${tag}</span>`).join("");
      const pinned = post.pinned ? "<span>置顶</span>" : "";
      const commentCount = social.postComments?.[post.id]?.length || 0;
      return `
        <article class="post-card" style="animation-delay:${index * 45}ms">
          <img class="post-cover" src="${post.image}" alt="${post.title}" loading="lazy" />
          <div class="post-body">
            <div class="post-meta">
              ${pinned}
              <span>发布于 ${formatDate(post.date)}</span>
              <span>更新于 ${formatDate(post.updated || post.date)}</span>
              <span>${commentCount} 条评论</span>
            </div>
            <h3>${post.title}</h3>
            <p>${post.excerpt}</p>
            <div class="post-tags">${tags}</div>
            <button class="read-more" type="button" data-post="${post.id}">展开全文</button>
          </div>
        </article>
      `;
    })
    .join("");
};

const renderPostComments = (postId) => {
  const social = state.social;
  const comments = social.postComments?.[postId] || [];
  const user = window.BlogAuth.currentUser();
  document.querySelector(".post-guest-name").style.display = user ? "none" : "grid";

  $("#postCommentList").innerHTML = comments.length
    ? comments
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
        .join("")
    : `<div class="empty-inline">还没有评论，来抢沙发吧。</div>`;
};

const openPost = (id) => {
  const post = state.data.posts.find((item) => item.id === id);
  if (!post) return;
  state.activePostId = id;

  $("#dialogImage").src = post.image;
  $("#dialogImage").alt = post.title;
  $("#dialogMeta").innerHTML = `
    <span>发布于 ${formatDate(post.date)}</span>
    <span>更新于 ${formatDate(post.updated || post.date)}</span>
  `;
  $("#dialogTitle").textContent = post.title;
  $("#dialogTags").innerHTML = (post.tags || []).map((tag) => `<span class="post-tag"># ${tag}</span>`).join("");
  $("#dialogContent").textContent = post.content || post.excerpt || "";
  renderPostComments(id);
  $("#postDialog").showModal();
};

const render = () => {
  applySite();
  renderTags();
  renderPosts();
};

document.addEventListener("click", (event) => {
  const tagButton = event.target.closest("[data-tag]");
  if (tagButton) {
    state.activeTag = tagButton.dataset.tag;
    render();
  }

  const postButton = event.target.closest("[data-post]");
  if (postButton) openPost(postButton.dataset.post);
});

$("#closeDialog").addEventListener("click", () => $("#postDialog").close());
$("#postDialog").addEventListener("click", (event) => {
  if (event.target.id === "postDialog") $("#postDialog").close();
});

$("#postCommentForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.activePostId) return;

  const form = event.currentTarget;
  const identity = window.BlogAuth.publicIdentity(form.elements.guestName.value);
  const social = state.social;
  social.postComments = social.postComments || {};
  social.postComments[state.activePostId] = social.postComments[state.activePostId] || [];

  const commentPayload = {
    id: `post-comment-${Date.now()}`,
    authorId: identity.id,
    authorName: identity.name,
    authorType: identity.type,
    content: form.elements.content.value.trim(),
    createdAt: new Date().toISOString()
  };

  if (window.CarsonAPI) {
    try {
      const cloudComment = await window.CarsonAPI.postComments.create({
        postId: state.activePostId,
        content: commentPayload.content,
        guestName: form.elements.guestName.value
      });
      social.postComments[state.activePostId].push(normalizePostComment(cloudComment));
    } catch (error) {
      console.warn("云端文章评论不可用，保存到本地：", error.message);
      social.postComments[state.activePostId].push(commentPayload);
    }
  } else {
    social.postComments[state.activePostId].push(commentPayload);
  }

  saveSocial(social);
  form.reset();
  renderPostComments(state.activePostId);
  renderPosts();
});

$("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, document.body.classList.contains("dark") ? "dark" : "light");
});

if (localStorage.getItem(THEME_KEY) === "dark") {
  document.body.classList.add("dark");
}

render();

if (window.CarsonAPI) {
  window.CarsonAPI.postComments
    .list()
    .then((postComments) => {
      const normalized = {};
      Object.entries(postComments).forEach(([postId, comments]) => {
        normalized[postId] = comments.map(normalizePostComment);
      });
      saveSocial({ ...state.social, postComments: normalized });
      renderPosts();
      if (state.activePostId) renderPostComments(state.activePostId);
    })
    .catch((error) => console.warn("云端文章评论读取不可用，使用本地评论：", error.message));
}
