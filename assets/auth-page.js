const $ = (selector) => document.querySelector(selector);

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function renderAccount() {
  const user = window.BlogAuth.currentUser();
  $("#accountStatus").textContent = user
    ? `当前已登录：${user.nickname || user.username}（用户名：${user.username}）`
    : "当前以游客身份访问。";
}

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  try {
    await window.BlogAuth.login({
      username: form.elements.username.value,
      password: form.elements.password.value
    });
    form.reset();
    renderAccount();
    showToast("登录成功");
  } catch (error) {
    showToast(error.message || "登录失败");
  }
});

$("#registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  try {
    await window.BlogAuth.register({
      username: form.elements.username.value,
      nickname: form.elements.nickname.value,
      password: form.elements.password.value
    });
    form.reset();
    renderAccount();
    showToast("注册成功，已登录");
  } catch (error) {
    showToast(error.message || "注册失败");
  }
});

$("#logoutButton").addEventListener("click", async () => {
  await window.BlogAuth.logout();
  renderAccount();
  showToast("已退出登录");
});

renderAccount();
