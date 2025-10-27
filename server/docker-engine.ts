import http from "node:http";
import fs from "node:fs";

export interface DockerContainerSummary {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
  Ports: Array<{
    IP?: string;
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
  }>;
  Labels: Record<string, string>;
}

export class DockerEngine {
  private readonly socketPath: string;

  constructor(socketPath = process.env.DOCKER_SOCKET || "/var/run/docker.sock") {
    this.socketPath = socketPath;
  }

  get isAvailable(): boolean {
    try {
      return fs.existsSync(this.socketPath);
    } catch {
      return false;
    }
  }

  async listContainers(): Promise<DockerContainerSummary[]> {
    return await this.request<DockerContainerSummary[]>("GET", "/containers/json?all=1");
  }

  async startContainer(id: string): Promise<void> {
    await this.request<void>("POST", `/containers/${id}/start`);
  }

  async stopContainer(id: string): Promise<void> {
    await this.request<void>("POST", `/containers/${id}/stop`);
  }

  async restartContainer(id: string): Promise<void> {
    await this.request<void>("POST", `/containers/${id}/restart`);
  }

  async pullImage(image: string): Promise<void> {
    const encoded = encodeURIComponent(image);
    await this.request<void>("POST", `/images/create?fromImage=${encoded}`);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.isAvailable) {
      throw new Error(`Docker socket not found at ${this.socketPath}`);
    }

    const hasBody = body !== undefined;
    const payload = hasBody ? JSON.stringify(body) : undefined;

    return await new Promise<T>((resolve, reject) => {
      const options: http.RequestOptions = {
        method,
        socketPath: this.socketPath,
        path,
        headers: {
          ...(hasBody
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload!, "utf-8"),
              }
            : {}),
        },
      };

      const req = http.request(options, res => {
        const chunks: Buffer[] = [];

        res.on("data", chunk => {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        });

        res.on("end", () => {
          const statusCode = res.statusCode ?? 500;
          const raw = Buffer.concat(chunks).toString("utf-8");

          if (statusCode >= 400) {
            const message = raw || http.STATUS_CODES[statusCode] || "Docker API error";
            reject(new Error(`Docker API error ${statusCode}: ${message}`));
            return;
          }

          const contentType = res.headers["content-type"] ?? "";
          if (raw.length === 0) {
            resolve(undefined as T);
            return;
          }

          if (typeof contentType === "string" && contentType.includes("application/json")) {
            try {
              resolve(JSON.parse(raw) as T);
              return;
            } catch (error) {
              reject(new Error(`Failed to parse Docker response JSON: ${(error as Error).message}`));
              return;
            }
          }

          resolve(undefined as T);
        });
      });

      req.on("error", error => {
        reject(error);
      });

      if (payload) {
        req.write(payload);
      }

      req.end();
    });
  }
}
