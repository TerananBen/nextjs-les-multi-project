import { cookies, headers } from "next/headers";
import {
  getProjectById,
  DEFAULT_PROJECT,
  resolveProjectUuid,
  resolveProjectSlug,
  registerProject,
  normalizeNestProject,
  getAllProjects,
  createDynamicProject,
  isUuid,
} from "@/config/projects";
import type { ProjectConfig, NestProjectRaw } from "@/config/projects";
import {
  decodeJwtPayload,
  extractAllProjectIdsFromPayload,
  extractRolesFromPayload,
  extractProjectCodeFromPayload,
  extractProjectsMapFromPayload,
} from "@/lib/keycloak";

const BACKEND_BASE_URL = process.env.API_URL || "http://localhost:5000";

/**
 * Resolve project ID from request Host / x-forwarded-host header (e.g. project-b.localhost)
 */
export const resolveProjectFromHost = async (hostHeader?: string): Promise<string | undefined> => {
  let host = hostHeader;
  if (!host) {
    try {
      const headerList = await headers();
      host = (headerList.get("x-forwarded-host") || headerList.get("host") || "").split(",")[0].trim();
    } catch {
      return undefined;
    }
  }
  if (!host) return undefined;

  const hostWithoutPort = host.split(":")[0].toLowerCase();
  const parts = hostWithoutPort.split(".");
  const isLocalhost = hostWithoutPort.endsWith("localhost") || hostWithoutPort.includes("127.0.0.1");
  const minParts = isLocalhost ? 1 : 2;

  // 1. Check full domain match (e.g. project-b.localhost)
  const resolvedFull = resolveProjectUuid(hostWithoutPort);
  if (resolvedFull && isUuid(resolvedFull)) {
    return resolvedFull;
  }

  // 2. Check subdomain if not root/www
  if (parts.length > minParts && parts[0] && parts[0] !== "www" && parts[0] !== "localhost") {
    const sub = parts[0].replace(/_/g, "-");
    const resolvedSub = resolveProjectUuid(sub);
    if (resolvedSub && isUuid(resolvedSub)) {
      return resolvedSub;
    }
  }

  return undefined;
};

/**
 * Fetch all projects via Backend API and sync to memory registry
 */
export const fetchDbProjects = async (): Promise<ProjectConfig[]> => {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/iam/projects`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as NestProjectRaw[];
      if (Array.isArray(data) && data.length > 0) {
        const configs = data.map(normalizeNestProject);
        configs.forEach((c) => registerProject(c));
        return configs;
      }
    }
  } catch (error) {
    console.warn("[Project Registry] Warning: Backend API lookup for projects failed:", error);
  }

  return getAllProjects();
};

export const getUserProjectIds = async (): Promise<string[]> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("jwt")?.value;

  // Load live DB projects into registry
  const dbProjects = await fetchDbProjects();

  if (token) {
    const payload = decodeJwtPayload(token);
    const roles = extractRolesFromPayload(payload);
    const isSuperAdmin = roles.some((r) => {
      const lower = r.toLowerCase();
      return lower.includes("superadmin") || lower.includes("super_admin") || lower.includes("super-admin");
    });

    if (isSuperAdmin && dbProjects.length > 0) {
      return dbProjects.map((p) => p.id);
    }

    const projectsMap = extractProjectsMapFromPayload(payload);
    if (Object.keys(projectsMap).length > 0) {
      return Array.from(new Set(Object.values(projectsMap)));
    }

    const projects = extractAllProjectIdsFromPayload(payload);
    if (projects.length > 0) {
      return Array.from(new Set(projects.map((p) => resolveProjectUuid(p))));
    }
  }

  if (dbProjects.length > 0) {
    return dbProjects.map((p) => p.id);
  }

  return [resolveProjectUuid(DEFAULT_PROJECT)];
};

export const getProjectId = async (): Promise<string> => {
  const cookieStore = await cookies();
  const cookieProject = cookieStore.get("current_project")?.value;

  // Load live DB projects into registry
  const dbProjects = await fetchDbProjects();
  const defaultId = dbProjects.length > 0 ? (dbProjects[0].code || dbProjects[0].id) : DEFAULT_PROJECT;

  // Resolve project from host / subdomain (e.g. project-b.localhost)
  const hostProjectId = await resolveProjectFromHost();

  let activeProject = defaultId;

  // 1. Authenticated Keycloak session (User's project code / tenant in JWT claims)
  const token = cookieStore.get("jwt")?.value;
  if (token) {
    const payload = decodeJwtPayload(token);
    const tokenProjectCode = extractProjectCodeFromPayload(payload);
    const allowedProjects = extractAllProjectIdsFromPayload(payload);
    const roles = extractRolesFromPayload(payload);
    const isSuperAdmin = roles.some((r) => {
      const lower = r.toLowerCase();
      return lower.includes("superadmin") || lower.includes("super_admin") || lower.includes("super-admin");
    });

    const isProjectAllowed = (candidate: string) => {
      if (isSuperAdmin || allowedProjects.length === 0) return true;
      const cleanCandidate = candidate.toLowerCase();
      return (
        allowedProjects.some((p) => {
          const cleanP = p.toLowerCase();
          return cleanP === cleanCandidate || resolveProjectUuid(cleanP) === resolveProjectUuid(cleanCandidate);
        }) ||
        (tokenProjectCode ? tokenProjectCode.toLowerCase() === cleanCandidate : false)
      );
    };

    if (hostProjectId && isProjectAllowed(hostProjectId)) {
      activeProject = hostProjectId;
    } else if (cookieProject && isProjectAllowed(cookieProject)) {
      activeProject = cookieProject;
    } else if (tokenProjectCode) {
      activeProject = tokenProjectCode;
    } else if (allowedProjects.length > 0) {
      activeProject = allowedProjects[0];
    }
  } else {
    // Unauthenticated: prioritize subdomain/host, then cookie, then default
    if (hostProjectId) {
      activeProject = hostProjectId;
    } else if (cookieProject) {
      activeProject = cookieProject;
    }
  }

  return activeProject;
};

export const getProjectConfig = async (): Promise<ProjectConfig> => {
  const activeProject = await getProjectId();

  // Load live DB projects into registry
  const dbProjects = await fetchDbProjects();
  const found = dbProjects.find(
    (p) =>
      p.code?.toLowerCase() === activeProject.toLowerCase() ||
      p.id.toLowerCase() === activeProject.toLowerCase() ||
      p.uuid?.toLowerCase() === activeProject.toLowerCase() ||
      p.domain?.toLowerCase() === activeProject.toLowerCase()
  );
  if (found) {
    return found;
  }

  // 1. Check existing registered project
  const existing = getProjectById(activeProject, false);
  if (existing) {
    return existing;
  }

  // 2. Fetch live project config from database via NestJS
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/iam/projects/${encodeURIComponent(activeProject)}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as NestProjectRaw;
      if (data?.id) {
        const config = normalizeNestProject(data);
        registerProject(config);
        return config;
      }
    }
  } catch (error) {
    console.warn(`Notice: Backend API lookup for project ${activeProject} failed:`, error);
  }

  return getProjectById(activeProject) || createDynamicProject(activeProject);
};

export const getActiveProjectCode = async (): Promise<string> => {
  const cookieStore = await cookies();
  const cookieProject = cookieStore.get("current_project")?.value;
  const token = cookieStore.get("jwt")?.value;

  // Ensure DB projects are loaded into registry
  const dbProjects = await fetchDbProjects();

  if (cookieProject && cookieProject.trim()) {
    const cleanCookie = cookieProject.trim();
    if (!isUuid(cleanCookie)) {
      return cleanCookie;
    }
    const slug = resolveProjectSlug(cleanCookie);
    if (slug) return slug;
    const foundByUuid = dbProjects.find(
      (p) => p.id.toLowerCase() === cleanCookie.toLowerCase() || p.uuid?.toLowerCase() === cleanCookie.toLowerCase()
    );
    if (foundByUuid?.code) return foundByUuid.code;
  }

  if (token) {
    const payload = decodeJwtPayload(token);
    const tokenCode = extractProjectCodeFromPayload(payload);
    if (tokenCode) return tokenCode;
  }

  const defaultId = await getProjectId();
  const foundDefault = dbProjects.find(
    (p) =>
      p.id.toLowerCase() === defaultId.toLowerCase() ||
      p.uuid?.toLowerCase() === defaultId.toLowerCase() ||
      p.code?.toLowerCase() === defaultId.toLowerCase()
  );
  return foundDefault?.code || defaultId || "project-a";
};

