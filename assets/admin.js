const STORAGE_KEY = "personal_blog_data_v1";

const $ = (selector) => document.querySelector(selector);
const siteForm = $("#siteForm");
const postForm = $("#postForm");
const friendForm = $("#friendForm");
const list = $("#postManagerList");
const friendList = $("#friendManagerList");
const toast = $("#toast");

let data = loadData();
let activePostId = data.posts[0]?.id || "";
let activeFriendId = data.friends[0]?.id || "";
let cloudFriendMode = false;
let cloudFriendIds = new Set();

function cloneDefaultData() {
  return structuredClone(window.BLOG_DEFAULT_DATA);
}

function normalizeData(input) {
  const defaults = cloneDefaultData();
  return {
    ...defaults,
    ...input,
    site: { ...defaults.site, ...(input.site || {}) },
    posts: Array.isArray(input.posts) ? input.posts : defaults.posts,
    friends: Array.isArray(input.friends) ? input.friends : defaults.friends
  };
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return cloneDefaultData();

  try {
    return normalizeData(JSON.parse(saved));
  } catch {
    return cloneDefaultData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data, null, 2));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function slugify(text) {
  return (
    text
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^\w\u4e00-\u9fa5-]+/g, "")
      .replace(/-+/g, "-") || `post-${Date.now()}`
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function statusText(status) {
  const map = {
    approved: "审核通过",
    rejected: "未通过隐藏",
    pending: "待审核"
  };
  return map[status] || "待审核";
}

function normalizeCloudFriend(friend) {
  return {
    id: friend.id,
    name: friend.name,
    url: friend.url,
    description: friend.description || "",
    avatar: friend.avatar || "",
    status: friend.status || "pending",
    createdAt: friend.createdAt || friend.created_at || today()
  };
}

async function loadCloudFriends() {
  if (!window.CarsonAPI?.token?.()) return;
  try {
    const result = await window.CarsonAPI.request("/friends/admin");
    data.friends = (result.friends || []).map(normalizeCloudFriend);
    cloudFriendMode = true;
    cloudFriendIds = new Set(data.friends.map((friend) => friend.id));
    activeFriendId = data.friends[0]?.id || "";
    fillFriendForm();
    showToast("已连接 D1 云端友链管理");
  } catch (error) {
    console.warn("云端友链管理不可用，继续使用本地模式：", error.message);
  }
}

async function saveCloudFriend(friend) {
  if (!cloudFriendMode || !window.CarsonAPI) return null;

  if (cloudFriendIds.has(friend.id)) {
    await window.CarsonAPI.request(`/friends/${friend.id}`, {
      method: "PATCH",
      body: friend
    });
    return friend;
  }

  const created = await window.CarsonAPI.friends.submit(friend);
  const createdId = created.id;
  if (friend.status !== "pending") {
    await window.CarsonAPI.request(`/friends/${createdId}`, {
      method: "PATCH",
      body: { ...friend, id: createdId }
    });
  }
  return { ...friend, id: createdId };
}

function fillSiteForm() {
  Object.entries(data.site).forEach(([key, value]) => {
    if (siteForm.elements[key]) siteForm.elements[key].value = value || "";
  });
}

function readSiteForm() {
  const fields = ["title", "subtitle", "author", "avatar", "cover", "location", "accent", "footer"];
  fields.forEach((field) => {
    data.site[field] = siteForm.elements[field].value.trim();
  });
}

function renderPostList() {
  list.innerHTML = data.posts
    .map(
      (post) => `
        <button class="manager-item ${post.id === activePostId ? "active" : ""}" type="button" data-edit="${post.id}">
          <strong>${post.pinned ? "★ " : ""}${post.title || "未命名文章"}</strong>
          <span>${post.date || "未设置日期"} · ${(post.tags || []).join(" / ") || "无标签"}</span>
        </button>
      `
    )
    .join("");
}

function renderFriendList() {
  friendList.innerHTML = data.friends
    .map(
      (friend) => `
        <button class="manager-item friend-manager-item ${friend.id === activeFriendId ? "active" : ""}" type="button" data-friend="${friend.id}">
          <img src="${friend.avatar || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(friend.name || "friend")}`}" alt="${friend.name || "友链"} 的小头像" />
          <span class="friend-manager-info">
            <strong>${friend.name || "未命名友链"}</strong>
            <span class="status-pill ${friend.status || "pending"}">${statusText(friend.status)}</span>
            <span>${friend.url || "未设置链接"}</span>
          </span>
        </button>
      `
    )
    .join("");
}

function fillPostForm() {
  const post = data.posts.find((item) => item.id === activePostId) || data.posts[0];
  if (!post) {
    postForm.reset();
    return;
  }

  activePostId = post.id;
  postForm.elements.id.value = post.id;
  postForm.elements.title.value = post.title || "";
  postForm.elements.excerpt.value = post.excerpt || "";
  postForm.elements.content.value = post.content || "";
  postForm.elements.date.value = post.date || today();
  postForm.elements.updated.value = post.updated || post.date || today();
  postForm.elements.tags.value = (post.tags || []).join(", ");
  postForm.elements.image.value = post.image || "";
  postForm.elements.pinned.checked = Boolean(post.pinned);
  renderPostList();
}

function readPostForm() {
  const title = postForm.elements.title.value.trim();
  const rawId = postForm.elements.id.value || slugify(title);
  return {
    id: rawId,
    title,
    excerpt: postForm.elements.excerpt.value.trim(),
    content: postForm.elements.content.value.trim(),
    date: postForm.elements.date.value || today(),
    updated: postForm.elements.updated.value || postForm.elements.date.value || today(),
    tags: postForm.elements.tags.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    image: postForm.elements.image.value.trim(),
    pinned: postForm.elements.pinned.checked
  };
}

function fillFriendForm() {
  const friend = data.friends.find((item) => item.id === activeFriendId) || data.friends[0];
  if (!friend) {
    friendForm.reset();
    $("#friendPreview").innerHTML = "暂无友链";
    return;
  }

  activeFriendId = friend.id;
  friendForm.elements.id.value = friend.id;
  friendForm.elements.name.value = friend.name || "";
  friendForm.elements.url.value = friend.url || "";
  friendForm.elements.description.value = friend.description || "";
  friendForm.elements.avatar.value = friend.avatar || "";
  friendForm.elements.status.value = friend.status || "pending";
  friendForm.elements.avatarFile.value = "";
  renderFriendPreview(friend);
  renderFriendList();
}

function renderFriendPreview(friend = readFriendForm()) {
  $("#friendPreview").innerHTML = `
    <img src="${friend.avatar || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(friend.name || "friend")}`}" alt="友链头像预览" />
    <div>
      <strong>${friend.name || "友链名称"}</strong>
      <p>${friend.description || "这里会显示一句话介绍。"}</p>
      <span>${friend.url || "https://example.com"}</span>
    </div>
  `;
}

function readFriendForm() {
  const name = friendForm.elements.name.value.trim();
  return {
    id: friendForm.elements.id.value || `friend-${Date.now()}`,
    name,
    url: friendForm.elements.url.value.trim(),
    description: friendForm.elements.description.value.trim(),
    avatar: friendForm.elements.avatar.value.trim() || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name || "friend")}`,
    status: friendForm.elements.status.value || "pending",
    createdAt: data.friends.find((friend) => friend.id === activeFriendId)?.createdAt || today()
  };
}

function download(filename, text) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

siteForm.addEventListener("input", () => {
  readSiteForm();
  document.documentElement.style.setProperty("--accent", data.site.accent || "#0f766e");
});

$("#saveAll").addEventListener("click", () => {
  readSiteForm();
  saveData();
  showToast("设置已保存");
});

$("#newPost").addEventListener("click", () => {
  const post = {
    id: `post-${Date.now()}`,
    title: "新文章",
    excerpt: "这里填写文章摘要。",
    content: "这里填写正文内容。",
    date: today(),
    updated: today(),
    tags: ["随笔"],
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=1200&auto=format&fit=crop",
    pinned: false
  };

  data.posts.unshift(post);
  activePostId = post.id;
  fillPostForm();
  saveData();
  showToast("已新建文章");
});

$("#newFriend").addEventListener("click", () => {
  const friend = {
    id: `friend-${Date.now()}`,
    name: "新朋友",
    url: "https://example.com/",
    description: "这里填写友链介绍。",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=new-friend",
    status: "pending",
    createdAt: today()
  };

  data.friends.unshift(friend);
  activeFriendId = friend.id;
  fillFriendForm();
  saveData();
  showToast("已新建待审核友链");
});

postForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const post = readPostForm();
  const index = data.posts.findIndex((item) => item.id === activePostId);

  if (index >= 0) {
    data.posts[index] = post;
  } else {
    data.posts.unshift(post);
  }

  activePostId = post.id;
  saveData();
  fillPostForm();
  showToast("文章已保存");
});

$("#deletePost").addEventListener("click", () => {
  if (!activePostId) return;
  if (!confirm("确定删除当前文章吗？")) return;

  data.posts = data.posts.filter((post) => post.id !== activePostId);
  activePostId = data.posts[0]?.id || "";
  saveData();
  fillPostForm();
  renderPostList();
  showToast("文章已删除");
});

list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit]");
  if (!button) return;
  activePostId = button.dataset.edit;
  fillPostForm();
});

friendList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-friend]");
  if (!button) return;
  activeFriendId = button.dataset.friend;
  fillFriendForm();
});

friendForm.addEventListener("input", () => {
  renderFriendPreview();
});

friendForm.elements.avatarFile.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  friendForm.elements.avatar.value = await fileToDataUrl(file);
  renderFriendPreview();
  showToast("小头像已载入，记得保存友链");
});

friendForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  let friend = readFriendForm();

  if (cloudFriendMode) {
    try {
      friend = await saveCloudFriend(friend);
      await loadCloudFriends();
      activeFriendId = friend.id;
      fillFriendForm();
      showToast(friend.status === "approved" ? "云端友链已保存并显示" : "云端友链已保存");
      return;
    } catch (error) {
      showToast(error.message || "云端友链保存失败");
      return;
    }
  }

  const index = data.friends.findIndex((item) => item.id === activeFriendId);
  if (index >= 0) data.friends[index] = friend;
  else data.friends.unshift(friend);

  activeFriendId = friend.id;
  saveData();
  fillFriendForm();
  showToast(friend.status === "approved" ? "友链已保存并显示" : "友链已保存");
});

$("#approveFriend").addEventListener("click", () => {
  friendForm.elements.status.value = "approved";
  friendForm.requestSubmit();
});

$("#rejectFriend").addEventListener("click", () => {
  friendForm.elements.status.value = "rejected";
  friendForm.requestSubmit();
});

$("#deleteFriend").addEventListener("click", async () => {
  if (!activeFriendId) return;
  if (!confirm("确定删除当前友链吗？")) return;

  if (cloudFriendMode && cloudFriendIds.has(activeFriendId)) {
    try {
      await window.CarsonAPI.request(`/friends/${activeFriendId}`, { method: "DELETE" });
      await loadCloudFriends();
      showToast("云端友链已删除");
      return;
    } catch (error) {
      showToast(error.message || "云端友链删除失败");
      return;
    }
  }

  data.friends = data.friends.filter((friend) => friend.id !== activeFriendId);
  activeFriendId = data.friends[0]?.id || "";
  saveData();
  fillFriendForm();
  renderFriendList();
  showToast("友链已删除");
});

$("#exportJson").addEventListener("click", () => {
  readSiteForm();
  saveData();
  download("blog-data.json", JSON.stringify(data, null, 2));
  showToast("已导出 JSON");
});

$("#importJson").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const imported = JSON.parse(await file.text());
    if (!imported.site || !Array.isArray(imported.posts)) throw new Error("数据格式不正确");
    data = normalizeData(imported);
    activePostId = data.posts[0]?.id || "";
    activeFriendId = data.friends[0]?.id || "";
    saveData();
    fillSiteForm();
    fillPostForm();
    fillFriendForm();
    showToast("导入成功");
  } catch (error) {
    showToast(error.message || "导入失败");
  } finally {
    event.target.value = "";
  }
});

$("#resetData").addEventListener("click", () => {
  if (!confirm("确定恢复默认数据吗？这会覆盖当前浏览器中的修改。")) return;
  data = cloneDefaultData();
  activePostId = data.posts[0]?.id || "";
  activeFriendId = data.friends[0]?.id || "";
  saveData();
  fillSiteForm();
  fillPostForm();
  fillFriendForm();
  showToast("已恢复默认数据");
});

fillSiteForm();
fillPostForm();
fillFriendForm();
document.documentElement.style.setProperty("--accent", data.site.accent || "#0f766e");
loadCloudFriends();
