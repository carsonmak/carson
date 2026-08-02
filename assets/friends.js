const STORAGE_KEY = "personal_blog_data_v1";

const $ = (selector) => document.querySelector(selector);

function cloneDefaultData() {
  return structuredClone(window.BLOG_DEFAULT_DATA);
}

function normalizeData(data) {
  const defaults = cloneDefaultData();
  return {
    ...defaults,
    ...data,
    site: { ...defaults.site, ...(data.site || {}) },
    posts: Array.isArray(data.posts) ? data.posts : defaults.posts,
    friends: Array.isArray(data.friends) ? data.friends : defaults.friends
  };
}

function readData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return cloneDefaultData();

  try {
    return normalizeData(JSON.parse(saved));
  } catch {
    return cloneDefaultData();
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data, null, 2));
}

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[char];
  });
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2000);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

let data = readData();

function renderSiteStyle() {
  document.documentElement.style.setProperty("--accent", data.site.accent || "#0f766e");
}

function normalizeFriend(friend) {
  return {
    id: friend.id,
    name: friend.name,
    url: friend.url,
    description: friend.description,
    avatar: friend.avatar,
    status: friend.status || "approved",
    createdAt: friend.createdAt || friend.created_at
  };
}

function renderFriends(friendSource = data.friends) {
  const approvedFriends = friendSource.map(normalizeFriend).filter((friend) => friend.status === "approved");

  $("#friendGrid").innerHTML = approvedFriends.length
    ? approvedFriends
        .map(
          (friend, index) => `
            <a class="friend-card" href="${escapeHtml(friend.url)}" target="_blank" rel="noopener noreferrer" style="animation-delay:${index * 45}ms">
              <img src="${escapeHtml(friend.avatar)}" alt="${escapeHtml(friend.name)} 的头像" loading="lazy" />
              <div>
                <strong>${escapeHtml(friend.name)}</strong>
                <p>${escapeHtml(friend.description || "这位朋友还没有留下介绍。")}</p>
                <span>${escapeHtml(friend.url)}</span>
              </div>
            </a>
          `
        )
        .join("")
    : `<article class="empty-card">还没有审核通过的友链。</article>`;
}

$("#friendSubmitForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const file = form.elements.avatarFile.files?.[0];
  const avatar =
    file ? await fileToDataUrl(file) : form.elements.avatarUrl.value.trim() || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(form.elements.name.value.trim())}`;

  const friend = {
    id: `friend-${Date.now()}`,
    name: form.elements.name.value.trim(),
    url: form.elements.url.value.trim(),
    description: form.elements.description.value.trim(),
    avatar,
    status: "pending",
    createdAt: new Date().toISOString().slice(0, 10)
  };

  if (window.CarsonAPI) {
    try {
      await window.CarsonAPI.friends.submit(friend);
    } catch (error) {
      console.warn("云端友链提交不可用，保存到本地待审核：", error.message);
      data.friends.unshift(friend);
      saveData(data);
    }
  } else {
    data.friends.unshift(friend);
    saveData(data);
  }

  form.reset();
  showToast("已提交，等待后台审核后显示");
});

renderSiteStyle();
renderFriends();

if (window.CarsonAPI) {
  window.CarsonAPI.friends
    .list()
    .then((friends) => renderFriends(friends))
    .catch((error) => console.warn("云端友链读取不可用，使用本地友链：", error.message));
}
