# CARSON 静态个人网站

这是一个纯静态个人博客模板，前台采用手机优先的信息流样式，后台管理页使用浏览器本地存储保存内容。

## 文件说明

- `index.html`：博客前台入口
- `friends.html`：友情链接页面，展示审核通过的友链并支持用户提交申请
- `auth.html`：用户注册和登录页面
- `diary.html`：留言页面，用户和游客都可以发布
- `about.html`：我页面
- `admin.html`：后台管理入口
- `assets/default-data.js`：默认站点资料和文章数据
- `assets/app.js`：前台渲染逻辑
- `assets/friends.js`：友链展示和提交逻辑
- `assets/auth.js`：本地用户注册、登录和身份识别逻辑
- `assets/auth-page.js`：注册登录页逻辑
- `assets/diary.js`：留言和评论逻辑
- `assets/about.js`：我页面渲染逻辑
- `assets/admin.js`：后台管理逻辑
- `assets/styles.css`：响应式样式
- `functions/api/[[path]].js`：Cloudflare Pages Functions 后端 API，运行在 Workers Runtime
- `sql/schema.sql`：D1 数据库表结构
- `sql/seed.sql`：D1 初始友链数据
- `wrangler.toml`：Cloudflare/Wrangler 配置
- `package.json`：本地 Cloudflare 开发和部署脚本

## 使用方式

1. 打开 `index.html` 查看前台。
2. 打开 `friends.html` 查看和提交友情链接申请。
3. 打开 `auth.html` 注册或登录用户账号。
4. 打开 `diary.html` 发布留言，用户和游客都可以发布，也可以继续评论。
5. 在文章详情弹窗中可以发表评论，用户和游客都可以评论。
6. 打开 `admin.html` 修改站点设置、文章和友链审核状态。
7. 用户提交友链后默认是“待审核”，后台改为“审核通过”后才会在友链页面显示；改为“不通过”会隐藏。
8. 在后台点击“保存设置”，内容会保存在当前浏览器。
9. 点击“导出 JSON”备份数据。
10. 正式发布时，可以把源码上传到 GitHub，再通过 Cloudflare Pages 自动部署。

## 上传到 GitHub

1. 在 GitHub 新建一个仓库，例如 `carson-blog`。
2. 在本地安装 Git，并进入本项目文件夹。
3. 执行以下命令：

```bash
git init
git add .
git commit -m "Initial CARSON static site"
git branch -M main
git remote add origin https://github.com/你的用户名/carson-blog.git
git push -u origin main
```

如果仓库已经存在并且已绑定远程地址，只需要执行：

```bash
git add .
git commit -m "Update CARSON site"
git push
```

## 部署到 Cloudflare

### 创建 D1 数据库

1. 安装依赖：

```bash
npm install
```

2. 登录 Cloudflare：

```bash
npx wrangler login
```

3. 创建 D1 数据库：

```bash
npx wrangler d1 create carson-db
```

4. 把命令返回的 `database_id` 复制到 `wrangler.toml` 的 `database_id` 字段。

5. 初始化数据库表：

```bash
npm run d1:init
```

6. 导入默认友链数据：

```bash
npm run d1:seed
```

### 本地 Cloudflare 模式测试

```bash
npm run dev
```

本地打开 Wrangler 输出的地址，即可测试 `/api`、注册登录、评论、留言和 D1 友链。

### Cloudflare Pages 部署

1. 登录 Cloudflare 控制台。
2. 进入 `Workers & Pages`。
3. 点击 `Create application`。
4. 选择 `Pages`，再选择 `Connect to Git`。
5. 授权并选择刚才上传的 GitHub 仓库。
6. 构建设置：
   - Framework preset：`None`
   - Build command：`npm install`
   - Build output directory：`.`
7. 点击部署，完成后 Cloudflare 会生成一个 `*.pages.dev` 临时域名。
8. 在 Pages 项目的 `Settings` → `Functions` → `D1 database bindings` 中添加绑定：
   - Variable name：`DB`
   - D1 database：选择 `carson-db`
9. 重新部署一次。
10. 如果你有自己的域名，可以在 Pages 项目里绑定自定义域名。

### 管理员账号

管理员账号由你部署时自行设置，不再由第一个注册用户自动生成。普通用户在网站注册后只会是普通用户。

在 Cloudflare Pages 项目的 `Settings` → `Environment variables` 中添加：

- `ADMIN_USERNAME`：管理员用户名，例如 `admin`
- `ADMIN_PASSWORD`：管理员密码，请设置强密码
- `ADMIN_NICKNAME`：管理员昵称，例如 `CARSON 管理员`

保存环境变量后重新部署。之后用这个账号在 `auth.html` 登录，即可获得管理员权限；登录后打开 `admin.html`，后台会自动连接 D1 友链管理，可以审核通过、隐藏或删除用户提交的友链。

本地开发时，也可以在 `wrangler.toml` 里取消 `[vars]` 示例注释并填写自己的管理员账号密码。正式部署不建议把真实密码写进源码或提交到 GitHub。

如果你想额外使用接口 Token 管理友链，可以在 Cloudflare Pages 环境变量中设置 `ADMIN_TOKEN`，调用管理接口时带上请求头 `x-admin-token`。

## 说明

当前版本已经包含 Cloudflare Pages Functions + Workers Runtime + D1 后端接口。部署并绑定 D1 后，注册用户、文章评论、留言和友链申请会保存到 D1，公网访客可以共享同一套数据。若 `/api` 不可用，前端会自动退回浏览器本地存储模式，方便离线预览。
