# Leanote MCP

Cursor 可用的 MCP 服务，用于对接自建 [Leanote](https://github.com/leanote/leanote) 笔记服务。

支持两种运行模式：
- **stdio**：本机 Cursor 直接启动子进程
- **HTTP**：部署到远程服务器（如 `192.168.2.150`），Cursor 通过 URL 连接

## 功能

| 工具 | 说明 |
|------|------|
| `leanote_list_notebooks` | 列出所有笔记本，获取 `NotebookId` |
| `leanote_create_note` | 在指定笔记本中新建笔记 |

## 远程部署（推荐：192.168.2.150）

### 0. Leanote 二进制部署（Mongo + Leanote 分离目录）

Leanote 服务与 MongoDB 采用**二进制安装**，目录分离：

| 组件 | 路径 |
|------|------|
| MongoDB | `/home/byan/mongo`（二进制、db、日志） |
| Leanote | `/home/byan/leanote` |
| 启停脚本 | `/home/byan/start.sh` |

在本机通过代理 **7890** 下载安装包，上传到服务器并自动安装（会删除旧的 `/home/byan/leanote` 合并目录，并迁移已有数据库）：

```powershell
cd C:\Users\abc\Projects\leanote-mcp
.\scripts\leanote\deploy-leanote-binary.ps1
```

可选参数：

```powershell
.\scripts\leanote\deploy-leanote-binary.ps1 `
  -Server leanote-server `
  -Proxy http://127.0.0.1:7890 `
  -LeanoteVersion 2.6.1 `
  -MongoVersion 4.0.28
```

下载缓存目录：`.cache/leanote-deploy/`（已加入 `.gitignore`）

- Leanote 二进制：GitHub Release 页指向的 [SourceForge 官方包](https://sourceforge.net/projects/leanote-bin/)
- MongoDB：`fastdl.mongodb.org` 官方 tarball（与 Leanote 2.x 兼容的 4.4 系列）

服务器上管理服务：

```bash
/home/byan/start.sh status
/home/byan/start.sh restart
/home/byan/start.sh stop
```

Leanote 默认端口 **9002**（与 MCP 配置 `baseUrl` 一致）。

### 1. 在服务器上准备 MCP 环境

服务器需已安装 **Docker** 和 **Docker Compose**。

将项目上传到服务器 `/opt/leanote-mcp`，或在本机执行（需已配置 SSH 别名 `leanote-server`）：

```powershell
cd C:\Users\abc\Projects\leanote-mcp
.\deploy-remote.ps1
```

也可手动在服务器上：

```bash
cd /opt/leanote-mcp
cp .env.example .env
# 编辑 .env，填写 Leanote 地址和账号
nano .env
chmod +x deploy.sh
./deploy.sh
```

### 2. 配置 Leanote 凭据（配置文件，推荐）

Leanote 地址和账号**不要**写在 `.env` 或 `docker-compose.yml` 中，统一放在配置文件：

```bash
cd ~/leanote-mcp
cp config/leanote.example.json config/leanote.json
nano config/leanote.json
chmod 600 config/leanote.json
```

`config/leanote.json` 示例：

```json
{
  "baseUrl": "http://192.168.2.150:9002",
  "email": "admin",
  "password": "your-password"
}
```

也可使用 `token` 字段代替邮箱密码（二选一）：

```json
{
  "baseUrl": "http://192.168.2.150:9002",
  "token": "your-api-token"
}
```

该文件已加入 `.gitignore`，Docker 以只读方式挂载进容器。

### 3. 验证部署

```bash
curl http://192.168.2.150:3100/health
# 应返回 {"status":"ok","service":"leanote-mcp"}
```

### 4. 配置 Cursor（HTTP 模式）

编辑 `%USERPROFILE%\.cursor\mcp.json`：

```json
{
  "mcpServers": {
    "leanote": {
      "type": "http",
      "url": "http://192.168.2.150:3100/mcp"
    }
  }
}
```

重启 Cursor 后在 Agent 对话中即可使用 `leanote_list_notebooks` 和 `leanote_create_note`。

## 多人使用（HTTP 模式）

Leanote 支持多用户，MCP 服务器也支持多人各自使用自己的 Leanote 账号。

### 服务器配置（仅 baseUrl）

多人模式下，服务器配置文件**只需填写 Leanote 地址**，不要放任何用户的账号密码：

```json
{
  "baseUrl": "http://192.168.2.150:9002"
}
```

可参考 `config/leanote.server.example.json`。部署后 `/health` 会返回 `"multiUser": true`。

### 每个用户在 Cursor 中配置凭据

每位用户在**自己的** `%USERPROFILE%\.cursor\mcp.json` 中连接同一 MCP 地址，并通过 `headers` 传入自己的 Leanote 凭据。

**方式一：API Token（推荐）**

先在 Leanote 网页端获取 API Token，然后配置：

```json
{
  "mcpServers": {
    "leanote": {
      "type": "http",
      "url": "http://192.168.2.150:3100/mcp",
      "headers": {
        "Authorization": "Bearer ${env:LEANOTE_TOKEN}"
      }
    }
  }
}
```

在系统环境变量中设置 `LEANOTE_TOKEN`（不要写进代码仓库）。

**方式二：邮箱 + 密码**

```json
{
  "mcpServers": {
    "leanote": {
      "type": "http",
      "url": "http://192.168.2.150:3100/mcp",
      "headers": {
        "X-Leanote-Email": "${env:LEANOTE_EMAIL}",
        "X-Leanote-Password": "${env:LEANOTE_PASSWORD}"
      }
    }
  }
}
```

也可使用 `X-Leanote-Token` 代替 `Authorization: Bearer`。

完整示例见 `cursor-mcp.multi-user.example.json`。

### 向后兼容（单用户）

若服务器 `config/leanote.json` 中仍包含 `email`/`password` 或 `token`，则未传 headers 的请求会回退到该默认账号（单用户模式）。多人部署时建议配置文件只保留 `baseUrl`。

## 本机 stdio 模式

```bash
npm install
npm run build
```

```json
{
  "mcpServers": {
    "leanote": {
      "type": "stdio",
      "command": "node",
      "args": ["C:/Users/abc/Projects/leanote-mcp/dist/index.js"],
      "env": {
        "LEANOTE_BASE_URL": "http://你的leanote地址",
        "LEANOTE_EMAIL": "your@email.com",
        "LEANOTE_PASSWORD": "your-password"
      }
    }
  }
}
```

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `LEANOTE_CONFIG_PATH` | 否 | Leanote 配置文件路径，默认 `config/leanote.json` |
| `MCP_HOST` | 否 | HTTP 监听地址，默认 `0.0.0.0` |
| `MCP_PORT` | 否 | HTTP 端口，默认 `3100` |

### HTTP 请求头（多人模式，由 Cursor 发送）

| 请求头 | 说明 |
|--------|------|
| `Authorization: Bearer <token>` | Leanote API Token |
| `X-Leanote-Token` | 同上，替代写法 |
| `X-Leanote-Email` + `X-Leanote-Password` | 邮箱密码登录 |

Leanote 凭据优先从配置文件读取。仅当配置文件不存在时，才回退到以下环境变量（不推荐用于生产）：

| 变量 | 说明 |
|------|------|
| `LEANOTE_BASE_URL` | Leanote 服务地址 |
| `LEANOTE_EMAIL` / `LEANOTE_PASSWORD` | 登录凭据 |
| `LEANOTE_TOKEN` | API Token |

## Leanote API 说明

- 登录：`GET /api/auth/login?email=...&pwd=...`
- 列笔记本：`GET /api/notebook/getNotebooks?token=...`
- 新建笔记：`POST /api/note/addNote?token=...`

详见 [Leanote API Wiki](https://github.com/leanote/leanote/wiki/leanote-api-en)。

