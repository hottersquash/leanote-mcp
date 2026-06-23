# Leanote MCP

Cursor 可用的 MCP 服务，对接自建 [Leanote](https://github.com/leanote/leanote) 笔记。多人共用同一 MCP 服务，各用户使用自己的 Leanote 账号。

| 工具 | 说明 |
|------|------|
| `leanote_list_notebooks` | 列出笔记本，获取 `NotebookId` |
| `leanote_create_note` | 在指定笔记本中新建笔记 |

## 部署 MCP 服务

服务器需安装 Docker 与 Docker Compose。

```bash
git clone <repo-url> /opt/leanote-mcp
cd /opt/leanote-mcp
cp config/leanote.example.json config/leanote.json
# 编辑 config/leanote.json（仅 Leanote 地址），按需修改 docker-compose.yml 中的 MCP 参数
chmod 600 config/leanote.json
docker compose up -d --build
```

**`docker-compose.yml`** — MCP 服务参数通过 `environment` 传入容器（默认值如下，可直接修改文件或通过环境变量覆盖）：

```yaml
environment:
  MCP_HOST: ${MCP_HOST:-0.0.0.0}
  MCP_PORT: ${MCP_PORT:-3100}
  LEANOTE_CONFIG_PATH: ${LEANOTE_CONFIG_PATH:-/app/config/leanote.json}
```

例如修改端口：`MCP_PORT=3200 docker compose up -d --build`

**`config/leanote.json`** — 只填写 Leanote 地址，**不要**写入任何用户凭据：

```json
{
  "baseUrl": "http://your-leanote-host:9002"
}
```

验证：

```bash
curl http://your-mcp-host:3100/health
# {"status":"ok","service":"leanote-mcp"}
```

从 Windows 本机一键上传部署（需配置 SSH）：

```powershell
.\deploy-remote.ps1 -Server your-server
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

## 配置参考

| 文件 / 变量 | 说明 |
|-------------|------|
| `docker-compose.yml` | MCP 服务参数（`MCP_HOST`、`MCP_PORT`、`LEANOTE_CONFIG_PATH`） |
| `config/leanote.json` | Leanote 服务地址（仅 `baseUrl`） |
| `LEANOTE_CONFIG_PATH` | 容器内配置文件路径，默认 `/app/config/leanote.json` |
| `MCP_HOST` / `MCP_PORT` | HTTP 监听地址与端口，默认 `0.0.0.0:3100` |

### HTTP 请求头

| 请求头 | 说明 |
|--------|------|
| `Authorization: Bearer <token>` | Leanote API Token |
| `X-Leanote-Token` | 同上 |
| `X-Leanote-Email` + `X-Leanote-Password` | 邮箱密码登录 |
