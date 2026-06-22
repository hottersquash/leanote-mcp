import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LeanoteClient } from "./leanote-client.js";

export function createMcpServer(client: LeanoteClient): McpServer {
  const server = new McpServer({
    name: "leanote-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "leanote_list_notebooks",
    {
      title: "List Leanote notebooks",
      description:
        "List all notebooks from the configured Leanote server. Use the returned NotebookId when creating notes.",
      inputSchema: {},
    },
    async () => {
      const notebooks = await client.getNotebooks();
      const summary = notebooks.map((notebook) => ({
        NotebookId: notebook.NotebookId,
        Title: notebook.Title,
        ParentNotebookId: notebook.ParentNotebookId ?? "",
        Usn: notebook.Usn,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "leanote_create_note",
    {
      title: "Create Leanote note",
      description:
        "Create a new note in Leanote. Requires a notebookId from leanote_list_notebooks.",
      inputSchema: {
        notebookId: z
          .string()
          .min(1)
          .describe(
            "Target notebook ID (NotebookId from leanote_list_notebooks)",
          ),
        title: z.string().min(1).describe("Note title"),
        content: z.string().describe("Note body content"),
        tags: z
          .array(z.string())
          .optional()
          .describe("Optional tags for the note"),
        abstract: z
          .string()
          .optional()
          .describe(
            "Optional summary; defaults to first 200 chars for markdown",
          ),
        isMarkdown: z
          .boolean()
          .optional()
          .default(true)
          .describe("Whether the note is markdown (default: true)"),
      },
    },
    async ({ notebookId, title, content, tags, abstract, isMarkdown }) => {
      const note = await client.createNote({
        notebookId,
        title,
        content,
        tags,
        abstract,
        isMarkdown,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                Ok: true,
                NoteId: note.NoteId,
                NotebookId: note.NotebookId,
                Title: note.Title,
                IsMarkdown: note.IsMarkdown,
                Usn: note.Usn,
                CreatedTime: note.CreatedTime,
                UpdatedTime: note.UpdatedTime,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  return server;
}
