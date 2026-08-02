window.BLOG_DEFAULT_DATA = {
  site: {
    title: "CARSON",
    subtitle: "把生活、技术和灵感写成一条条动态",
    author: "你的名字",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop",
    cover: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=80&w=1600&auto=format&fit=crop",
    location: "Guangzhou",
    accent: "#0f766e",
    footer: "CARSON ｜MAK技术支持"
  },
  friends: [
    {
      id: "friend-tianzhen",
      name: "天真",
      url: "https://bin.zmide.com/",
      description: "与君初识，宛如故人",
      avatar: "https://aka.doubaocdn.com/s/TBJeaQZYwq",
      status: "approved",
      createdAt: "2026-08-02"
    },
    {
      id: "friend-ligen131",
      name: "ligen131",
      url: "https://ligen.life/",
      description: "Don't worry, be happy.",
      avatar: "https://api.dicebear.com/9.x/initials/svg?seed=ligen131",
      status: "approved",
      createdAt: "2026-08-02"
    },
    {
      id: "friend-jyi2ya",
      name: "jyi2ya 的博客",
      url: "https://jyi2ya.github.io/",
      description: "Let me write C again and kill me.",
      avatar: "https://aka.doubaocdn.com/s/ZropHt0IKq",
      status: "approved",
      createdAt: "2026-08-02"
    },
    {
      id: "friend-chales",
      name: "Chales",
      url: "https://www.n2ptr.space/",
      description: "just a blog",
      avatar: "https://aka.doubaocdn.com/s/5cYvViUOdp",
      status: "approved",
      createdAt: "2026-08-02"
    },
    {
      id: "friend-left-demo",
      name: "暂离示例",
      url: "https://example.com/",
      description: "审核不通过或暂时离开时不会在前台显示。",
      avatar: "https://api.dicebear.com/9.x/initials/svg?seed=hidden",
      status: "rejected",
      createdAt: "2026-08-02"
    }
  ],
  posts: [
    {
      id: "hello-static-blog",
      title: "把博客做成自己的时间线",
      excerpt: "这套模板把传统博客改造成手机上更容易阅读的信息流，每篇文章像一条朋友圈动态，也可以展开成完整文章。",
      content: "静态博客不一定只能是传统列表。它可以像微博或微信朋友圈一样，以时间线组织每一次记录：短想法、长文章、图片、标签和更新日期都能放在同一个信息流里。\n\n前台只依赖 HTML、CSS 和 JavaScript，所以可以部署到 GitHub Pages、Cloudflare Pages、Netlify、Vercel 或任何静态空间。后台管理页运行在浏览器中，内容会保存在本地，也可以导出 JSON 备份。",
      date: "2026-08-02",
      updated: "2026-08-02",
      tags: ["博客", "静态网站", "生活记录"],
      image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=1200&auto=format&fit=crop",
      pinned: true
    },
    {
      id: "mobile-first",
      title: "手机访问优先的阅读体验",
      excerpt: "底部导航、卡片式动态、轻量弹层和一键回到顶部，让手机阅读更像常用社交应用。",
      content: "移动端是这个模板的第一优先级。页面底部保留导航，顶部头像和站点信息保持轻量，文章以卡片流展示。\n\n桌面端会自动切换为左侧个人资料栏加右侧文章流布局，既保留个人主页的仪式感，也不会牺牲手机上的阅读效率。",
      date: "2026-07-28",
      updated: "2026-08-01",
      tags: ["移动端", "UI", "体验"],
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",
      pinned: false
    },
    {
      id: "admin-panel",
      title: "无需服务器的后台管理",
      excerpt: "后台可以修改站点信息、主题色、文章内容和标签，并把数据导出为 JSON 文件。",
      content: "由于这是静态网站，后台不会连接数据库。管理页会把修改保存在当前浏览器的 localStorage 中，并提供导入、导出和重置功能。\n\n如果你后续要正式发布，可以把导出的 JSON 内容合并回 `assets/default-data.js`，或者继续扩展为真正的 CMS、GitHub API 提交、Cloudflare D1 后台等方案。",
      date: "2026-07-20",
      updated: "2026-07-25",
      tags: ["后台", "localStorage", "部署"],
      image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop",
      pinned: false
    }
  ]
};
