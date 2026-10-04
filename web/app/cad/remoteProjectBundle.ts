import { ApplicationContext } from "cad/context";
import { ModelBundle } from "cad/projectManager/projectManagerBundle";

export const BundleName = "@RemoteProject";

function authBaseUrl() {
  const host = window.location.hostname.toLowerCase();
  const isLocal = host === "localhost" || host === "127.0.0.1" || host.indexOf(".ddev.site") !== -1;
  return isLocal ? "http://localhost:3000" : "https://auth.structuredchaos.dev";
}

function signInUrl() {
  return authBaseUrl() + "/";
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${authBaseUrl()}/api/auth${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init && init.headers ? init.headers : {}),
    },
  });

  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`JSketcher project API failed: ${response.status}`);
  }
  return response.json();
}

export function activate(ctx: ApplicationContext) {
  async function list() {
    const result = await request("/jsketcher/list");
    if (!result) {
      return null;
    }
    return result.projects;
  }

  async function load(uuid: string) {
    const result = await request(`/jsketcher/get?uuid=${encodeURIComponent(uuid)}`);
    if (!result || !result.project) {
      return null;
    }
    return {
      ...result.project,
      data: JSON.parse(result.project.data) as ModelBundle,
    };
  }

  async function save(uuid: string, name: string, data: ModelBundle) {
    return request("/jsketcher/save", {
      method: "POST",
      body: JSON.stringify({
        uuid,
        name,
        data: JSON.stringify(data),
      }),
    });
  }

  async function remove(uuid: string) {
    return request("/jsketcher/delete", {
      method: "POST",
      body: JSON.stringify({ uuid }),
    });
  }

  ctx.remoteProjectService = {
    list,
    load,
    save,
    remove,
    signInUrl,
  };
}

export interface RemoteProjectService {
  list(): Promise<{ uuid: string, name: string, createdAt?: string }[] | null>;

  load(uuid: string): Promise<{ data: ModelBundle } | null>;

  save(uuid: string, name: string, data: ModelBundle): Promise<unknown>;

  remove(uuid: string): Promise<unknown>;

  signInUrl(): string;
}

export interface RemoteProjectBundleContext {
  remoteProjectService: RemoteProjectService;
}
