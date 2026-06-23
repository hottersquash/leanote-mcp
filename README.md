# Leanote MCP

Cursor、ClaudeCode、Copliot可用的 MCP 服务，对接自建 [Leanote](https://github.com/leanote/leanote) 笔记。多人共用同一 MCP 服务，各用户使用自己的 Leanote 账号。

| 工具 | 说明 |
|------|------|
| `leanote_list_notebooks` | 列出笔记本，获取 `NotebookId` |
| `leanote_create_note` | 在指定笔记本中新建笔记 |

## 部署 MCP 服务

服务器需安装 Docker 与 Docker Compose。

```bash
git clone <repo-url> /opt/leanote-mcp
cd /opt/leanote-mcp
```

**`docker-compose.yml`**—修改环境变量：

```yaml
environment:
  # HTTP 监听地址与端口，默认 `0.0.0.0:3100`
  MCP_HOST: ${MCP_HOST:-0.0.0.0}
  MCP_PORT: ${MCP_PORT:-3100}
  # leanote 部署地址
  LEANOTE_BASE_URL: ${LEANOTE_BASE_URL:-http://your-leanote-host:9002}
```

**不要**在 Docker 环境变量中写入用户凭据，凭据由 Cursor 请求头传入。

启动服务
```
docker compose up -d --build
```

验证：

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

完整示例见 `cursor-mcp.example.json`。重启 Cursor 后即可在 Agent 对话中使用上述工具。

## 配置 Claude Code或者Copilot
见`mcp.example`

## 配置参考

### HTTP 请求头

| 请求头 | 说明 |
|--------|------|
| `Authorization: Bearer <token>` | Leanote API Token |
| `X-Leanote-Token` | 同上 |
| `X-Leanote-Email` + `X-Leanote-Password` | 邮箱密码登录 |
