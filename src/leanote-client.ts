export interface LeanoteConfig {
  baseUrl: string;
  email: string;
  password: string;
  token?: string;
}

export interface LeanoteResponse<T = unknown> {
  Ok: boolean;
  Msg?: string;
  Token?: string;
  UserId?: string;
  Email?: string;
  Username?: string;
}

export interface Notebook {
  NotebookId: string;
  UserId: string;
  ParentNotebookId?: string;
  Seq: number;
  Title: string;
  IsBlog: boolean;
  IsDeleted: boolean;
  CreatedTime: string;
  UpdatedTime: string;
  Usn: number;
}

export interface Note {
  NoteId: string;
  NotebookId: string;
  UserId: string;
  Title: string;
  Tags?: string[] | null;
  Content?: string;
  IsMarkdown: boolean;
  IsBlog: boolean;
  IsTrash: boolean;
  IsDeleted?: boolean;
  Usn: number;
  CreatedTime: string;
  UpdatedTime: string;
  PublicTime?: string;
}

export interface CreateNoteInput {
  notebookId: string;
  title: string;
  content: string;
  tags?: string[];
  abstract?: string;
  isMarkdown?: boolean;
}

export class LeanoteClient {
  private token: string | null = null;

  constructor(private readonly config: LeanoteConfig) {
    if (config.token) {
      this.token = config.token;
    }
  }

  private apiUrl(path: string, params: Record<string, string> = {}): string {
    const url = new URL(`/api${path}`, this.config.baseUrl);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    if (this.token) {
      url.searchParams.set("token", this.token);
    }
    return url.toString();
  }

  async login(): Promise<void> {
    if (this.token) {
      return;
    }

    const url = this.apiUrl("/auth/login", {
      email: this.config.email,
      pwd: this.config.password,
    });

    const response = await fetch(url, { method: "GET" });
    const data = (await response.json()) as LeanoteResponse;

    if (!data.Ok || !data.Token) {
      throw new Error(data.Msg || "Leanote login failed");
    }

    this.token = data.Token;
  }

  async getNotebooks(): Promise<Notebook[]> {
    await this.login();

    const response = await fetch(this.apiUrl("/notebook/getNotebooks"), {
      method: "GET",
    });
    const data = (await response.json()) as Notebook[] | LeanoteResponse;

    if (!Array.isArray(data)) {
      throw new Error((data as LeanoteResponse).Msg || "Failed to fetch notebooks");
    }

    return data.filter((notebook) => !notebook.IsDeleted);
  }

  async createNote(input: CreateNoteInput): Promise<Note> {
    await this.login();

    const body = new URLSearchParams();
    body.set("NotebookId", input.notebookId);
    body.set("Title", input.title);
    body.set("Content", input.content);

    if (input.tags?.length) {
      input.tags.forEach((tag, index) => {
        body.set(`Tags[${index}]`, tag);
      });
    }

    const isMarkdown = input.isMarkdown ?? true;
    body.set("IsMarkdown", String(isMarkdown));

    if (input.abstract !== undefined) {
      body.set("Abstract", input.abstract);
    } else if (isMarkdown) {
      body.set("Abstract", input.content.slice(0, 200));
    }

    const response = await fetch(this.apiUrl("/note/addNote"), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = (await response.json()) as Note | LeanoteResponse;

    if ("Ok" in data && data.Ok === false) {
      throw new Error(data.Msg || "Failed to create note");
    }

    return data as Note;
  }
}
