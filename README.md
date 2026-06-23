# Leanote MCP

Cursor、ClaudeCode、Copliot可用的 MCP 服务，对接自建 [Leanote](https://github.com/leanote/leanote) 笔记。多人共用同一 MCP 服务，各用户使用自己的 Leanote 账号。

| 工具 | 说明 |
|------|------|
| `leanote_list_notebooks` | 列出笔记本，获取 `NotebookId` |
| `leanote_create_note` | 在指定笔记本中新建笔记 |

## 部署 MCP 服务

支持 **Docker** 与 **npm** 两种方式，环境变量含义相同。

| 变量 | 说明 |
|------|------|
| `MCP_HOST` / `MCP_PORT` | HTTP 监听地址与端口，默认 `0.0.0.0:3100` |
| `LEANOTE_BASE_URL` | Leanote 服务地址 |

**不要**写入用户凭据，凭据由 Cursor 请求头传入。

### Docker

服务器需安装 Docker 与 Docker Compose。

```bash
git clone <repo-url> /opt/leanote-mcp
cd /opt/leanote-mcp
```

编辑 `docker-compose.yml` 中的环境变量：

```yaml
environment:
  MCP_HOST: ${MCP_HOST:-0.0.0.0}
  MCP_PORT: ${MCP_PORT:-3100}
  LEANOTE_BASE_URL: ${LEANOTE_BASE_URL:-http://your-leanote-host:9002}
```

```bash
docker compose up -d --build
# 或
./deploy-docker.sh
```

### npm

服务器需安装 Node.js >= 18。

```bash
git clone <repo-url> /opt/leanote-mcp
cd /opt/leanote-mcp
cp env.example .env
# 编辑 .env，设置 LEANOTE_BASE_URL
npm install
npm run build
npm start
```

`.env` 示例（见 `env.example`）：

```env
MCP_HOST=0.0.0.0
MCP_PORT=3100
LEANOTE_BASE_URL=http://your-leanote-host:9002
```

生产环境推荐使用 systemd 一键部署：

```bash
./deploy-npm.sh
```

首次运行会创建 `.env` 并提示编辑；再次执行将安装/重启 `leanote-mcp` 服务。也可手动安装：

```bash
sudo cp leanote-mcp.service.example /etc/systemd/system/leanote-mcp.service
# 修改 WorkingDirectory、EnvironmentFile 为实际路径
sudo systemctl daemon-reload
sudo systemctl enable --now leanote-mcp
```

### 远程部署

从 Windows 本机上传并部署（需配置 SSH）：

```powershell
# Docker（默认）
.\deploy-remote.ps1 -Server your-server

# npm
.\deploy-remote.ps1 -Server your-server -DeployMode npm
```

### 验证

```bash
curl http://your-mcp-host:3100/health
# {"status":"ok","service":"leanote-mcp"}
```

## 配置 Cursor

各用户在自己的 `%USERPROFILE%\.cursor\mcp.json` 中连接 MCP 地址，并通过请求头传入自己的 Leanote 凭据。

**API Token（推荐）**

```json
{
  "mcpServers": {
    "leanote": {
      "type": "http",
      "url": "http://your-mcp-host:3100/mcp",
      "headers": {
        "Authorization": "Bearer ${env:LEANOTE_TOKEN}"
      }
    }
  }
}
```

在系统环境变量中设置 `LEANOTE_TOKEN`（不要写进代码仓库）。

**邮箱 + 密码**

```json
{
  "mcpServers": {
    "leanote": {
      "type": "http",
      "url": "http://your-mcp-host:3100/mcp",
      "headers": {
        "X-Leanote-Email": "${env:LEANOTE_EMAIL}",
        "X-Leanote-Password": "${env:LEANOTE_PASSWORD}"
      }
    }
  }
}
```

也可使用 `X-Leanote-Token` 代替 `Authorization: Bearer`。

完整示例见 `mcp.example/cursor-mcp.example.json`。重启 Cursor 后即可在 Agent 对话中使用上述工具。

## 配置 Claude Code或者Copilot

见 `mcp.example`

## 配置参考

### HTTP 请求头

| 请求头 | 说明 |
|--------|------|
| `Authorization: Bearer <token>` | Leanote API Token |
| `X-Leanote-Token` | 同上 |
| `X-Leanote-Email` + `X-Leanote-Password` | 邮箱密码登录 |
