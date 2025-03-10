import { z } from "zod";

// Input validation schemas
const addContentSchema = z.object({
  url: z.string().url(),
  doCrawl: z.boolean().default(false),
  content: z.string().optional(),
});

const processSchema = z.object({
  url: z.string().url().optional(),
});

// Types
export type AddContentInput = z.infer<typeof addContentSchema>;
export type ProcessInput = z.infer<typeof processSchema>;

interface APIErrorResponse {
  error: string;
  [key: string]: unknown;
}

class APIError extends Error {
  public status: number;
  public payload: APIErrorResponse;

  constructor(message: string, status: number, payload: APIErrorResponse) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.payload = payload;
  }
}

export class RagRabbitAPI {
  private baseUrl: string;
  private apiKey: string;

  private constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    this.apiKey = apiKey;
  }

  static create(baseUrl: string, apiKey: string): RagRabbitAPI {
    return new RagRabbitAPI(baseUrl, apiKey);
  }

  private async request<T>(endpoint: string, method: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}/api/${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new APIError(data.error || "An unknown error occurred", response.status, data as APIErrorResponse);
    }

    return data as T;
  }

  async addContent(input: AddContentInput) {
    const validated = addContentSchema.parse(input);
    return this.request("content", "POST", validated);
  }

  async runProcessing(input?: ProcessInput) {
    const validated = input ? processSchema.parse(input) : {};
    return this.request("process", "POST", validated);
  }
}
