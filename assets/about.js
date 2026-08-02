const STORAGE_KEY = "personal_blog_data_v1";

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

const data = readData();
const approvedFriends = data.friends.filter((friend) => friend.status === "approved");

document.title = `我 · ${data.site.title || "个人博客"}`;
document.documentElement.style.setProperty("--accent", data.site.accent || "#0f766e");
document.querySelector("#aboutAvatar").src = data.site.avatar;
document.querySelector("#aboutTitle").textContent = data.site.title || "我";
document.querySelector("#aboutSubtitle").textContent = data.site.subtitle || "";
document.querySelector("#aboutAuthor").textContent = data.site.author || "你的名字";
document.querySelector("#aboutLocation").textContent = data.site.location || "";
document.querySelector("#aboutPosts").textContent = data.posts.length;
document.querySelector("#aboutFriends").textContent = approvedFriends.length;
