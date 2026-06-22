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

### 1. 在服务器上准备环境

服务器需已安装 **Docker** 和 **Docker Compose**。

将项目上传到服务器 `/opt/leanote-mcp`，或在本机执行（需 SSH 账号密码）：

```powershell
cd C:\Users\abc\Projects\leanote-mcp
.\deploy-remote.ps1 -Server 192.168.2.150 -User <你的SSH用户名>
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

