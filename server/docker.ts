import http from "node:http";
import { URLSearchParams } from "node:url";
import type { ContainerActionInput, ContainerService, ContainerStack } from "@shared/schema";

const DOCKER_SOCKET = process.env.DOCKER_SOCKET || "/var/run/docker.sock";

class DockerUnavailableError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "DockerUnavailableError";
  }
}

interface DockerPort {
  PrivatePort?: number;
  PublicPort?: number;
  Type?: string;
}

interface DockerContainerInfo {
  Id: string;
  Names?: string[];
  Image: string;
  ImageID: string;
  State: string;
  Status?: string;
  Ports: DockerPort[];
  Labels?: Record<string, string>;
  Created: number;
}

interface DockerStackDetails {
  stack: ContainerStack;
  containers: DockerContainerInfo[];
}

async function dockerRequest<T>(
  path: string,
  method: string = "GET",
  body?: unknown,
  parseJson: boolean = true,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    try {
      const request = http.request(
        {
          socketPath: DOCKER_SOCKET,
          path,
          method,
          headers: body
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(JSON.stringify(body)).toString(),
              }
            : undefined,
        },
        response => {
          const chunks: Buffer[] = [];
          response.on("data", chunk => chunks.push(chunk));
          response.on("end", () => {
            const data = Buffer.concat(chunks).toString();
            const status = response.statusCode ?? 500;
            if (status >= 200 && status < 300) {
              if (!parseJson || data.length === 0) {
                resolve(undefined as T);
                return;
              }
              try {
                resolve(JSON.parse(data) as T);
              } catch (error) {
                if (parseJson) {
                  reject(new Error(`Failed to parse Docker response: ${(error as Error).message}`));
                } else {
                  resolve(undefined as T);
                }
              }
            } else {
              reject(new Error(`Docker API responded with status ${status}: ${data}`));
            }
          });
        },
      );

      request.on("error", error => {
        reject(error);
      });

      if (body) {
        request.write(JSON.stringify(body));
      }
      request.end();
    } catch (error) {
      reject(error);
    }
  }).catch(error => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new DockerUnavailableError(
        `Docker socket not found at ${DOCKER_SOCKET}. Configure DOCKER_SOCKET env variable if necessary.`,
        error,
      );
    }
    if ((error as NodeJS.ErrnoException).code === "EACCES") {
      throw new DockerUnavailableError(
        `Permission denied when accessing Docker socket at ${DOCKER_SOCKET}.`,
        error,
      );
    }
    throw error;
  });
}

function mapDockerState(state: string): ContainerService["state"] {
  switch (state) {
    case "running":
      return "running";
    case "restarting":
      return "restarting";
    case "paused":
    case "exited":
    case "dead":
      return "stopped";
    default:
      return "error";
  }
}

function buildService(container: DockerContainerInfo): ContainerService {
  const name = container.Names?.[0]?.replace(/^\//, "") ?? container.Id.slice(0, 12);
  const ports = container.Ports.map(port => {
    const proto = port.Type ? `/${port.Type}` : "";
    if (port.PublicPort) {
      return `${port.PublicPort}:${port.PrivatePort ?? "?"}${proto}`;
    }
    if (port.PrivatePort) {
      return `${port.PrivatePort}${proto}`;
    }
    return "";
  }).filter(Boolean);

  return {
    name,
    image: container.Image,
    replicas: 1,
    state: mapDockerState(container.State),
    ports,
    lastEvent: container.Status ?? "",
  };
}

function determineStackStatus(services: ContainerService[]): ContainerStack["status"] {
  const running = services.filter(service => service.state === "running").length;
  const restarting = services.filter(service => service.state === "restarting").length;
  const stopped = services.filter(service => service.state === "stopped").length;
  if (services.length === 0) {
    return "stopped";
  }
  if (running === services.length) {
    return "running";
  }
  if (running === 0 && restarting === 0 && stopped === services.length) {
    return "stopped";
  }
  return "degraded";
}

function groupContainers(containers: DockerContainerInfo[]): Map<string, DockerStackDetails> {
  const groups = new Map<string, DockerStackDetails>();
  const now = new Date();

  for (const container of containers) {
    const labels = container.Labels ?? {};
    const project = labels["com.docker.compose.project"] || "docker-host";
    const stackId = project === "docker-host" ? container.Id : project;
    const stackName = project === "docker-host" ? "Containers locais" : project;
    const stackPath =
      labels["com.docker.compose.project.config-files"]?.split(",")[0] ||
      labels["com.docker.compose.project.working_dir"] ||
      "Docker";

    const service = buildService(container);

    const entry = groups.get(stackId);
    if (entry) {
      entry.containers.push(container);
      entry.stack.services.push(service);
      entry.stack.status = determineStackStatus(entry.stack.services);
      entry.stack.updatedAt = now;
    } else {
      const status = determineStackStatus([service]);
      groups.set(stackId, {
        containers: [container],
        stack: {
          id: stackId,
          name: stackName,
          projectName: project,
          path: stackPath,
          status,
          updatedAt: now,
          services: [service],
          lastAction: `Atualizado às ${now.toLocaleTimeString("pt-BR")}`,
        },
      });
    }
  }

  return groups;
}

async function fetchDockerContainers(): Promise<DockerContainerInfo[]> {
  return dockerRequest<DockerContainerInfo[]>("/containers/json?all=1");
}

export async function listDockerStacks(): Promise<ContainerStack[]> {
  try {
    const containers = await fetchDockerContainers();
    const groups = groupContainers(containers);
    return Array.from(groups.values()).map(group => group.stack);
  } catch (error) {
    if (error instanceof DockerUnavailableError) {
      throw error;
    }
    throw new Error(`Failed to list Docker containers: ${(error as Error).message}`);
  }
}

async function findStackDetails(stackId: string): Promise<DockerStackDetails | undefined> {
  const containers = await fetchDockerContainers();
  const groups = groupContainers(containers);
  return groups.get(stackId);
}

async function performActionOnContainer(containerId: string, action: ContainerActionInput["action"], image: string) {
  switch (action) {
    case "up":
      await dockerRequest(`/containers/${containerId}/start`, "POST", undefined, false);
      break;
    case "down":
      await dockerRequest(`/containers/${containerId}/stop`, "POST", undefined, false);
      break;
    case "restart":
      await dockerRequest(`/containers/${containerId}/restart`, "POST", undefined, false);
      break;
    case "pull": {
      const { repo, tag } = splitImage(image);
      const params = new URLSearchParams({ fromImage: repo });
      if (tag) {
        params.set("tag", tag);
      }
      await dockerRequest(`/images/create?${params.toString()}`, "POST", undefined, false);
      break;
    }
  }
}

function splitImage(image: string): { repo: string; tag?: string } {
  const lastColon = image.lastIndexOf(":");
  const lastSlash = image.lastIndexOf("/");
  if (lastColon === -1 || lastColon < lastSlash) {
    return { repo: image, tag: "latest" };
  }
  const repo = image.slice(0, lastColon);
  const tag = image.slice(lastColon + 1) || "latest";
  return { repo, tag };
}

export async function performDockerStackAction(
  stackId: string,
  action: ContainerActionInput,
): Promise<ContainerStack | undefined> {
  let details: DockerStackDetails | undefined;
  try {
    details = await findStackDetails(stackId);
  } catch (error) {
    if (error instanceof DockerUnavailableError) {
      throw error;
    }
    throw new Error(`Failed to resolve stack ${stackId}: ${(error as Error).message}`);
  }

  if (!details) {
    return undefined;
  }

  const targetNames = action.services?.length
    ? new Set(action.services)
    : new Set(details.stack.services.map(service => service.name));

  for (const container of details.containers) {
    const serviceName = container.Names?.[0]?.replace(/^\//, "") ?? container.Id.slice(0, 12);
    if (!targetNames.has(serviceName)) {
      continue;
    }
    try {
      await performActionOnContainer(container.Id, action.action, container.Image);
    } catch (error) {
      throw new Error(
        `Failed to execute action ${action.action} on container ${serviceName}: ${(error as Error).message}`,
      );
    }
  }

  const updated = await findStackDetails(stackId);
  if (!updated) {
    return undefined;
  }

  const affectedCount = action.services?.length ?? updated.stack.services.length;
  const now = new Date();
  let actionMessage: string;
  switch (action.action) {
    case "up":
      actionMessage = `Stack iniciado (${affectedCount} serviço(s))`;
      break;
    case "down":
      actionMessage = `Stack interrompido (${affectedCount} serviço(s))`;
      break;
    case "restart":
      actionMessage = `Stack reiniciado (${affectedCount} serviço(s))`;
      break;
    case "pull":
      actionMessage = `Imagens atualizadas (${affectedCount} serviço(s))`;
      break;
    default:
      actionMessage = "Ação executada";
  }

  updated.stack.lastAction = `${actionMessage} às ${now.toLocaleTimeString("pt-BR")}`;
  updated.stack.updatedAt = now;

  return updated.stack;
}

export { DockerUnavailableError };
