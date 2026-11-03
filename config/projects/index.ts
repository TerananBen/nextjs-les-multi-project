import type { ProjectConfig } from "./types";
import { defineProject } from "./helper";

export * from "./types";
export * from "./helper";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (val?: string): boolean => {
  return Boolean(val && UUID_REGEX.test(val.trim()));
};

// In-memory dynamic registry populated from PostgreSQL via NestJS
const projects: Record<string, ProjectConfig> = {};
const PROJECT_ALIAS_TO_UUID: Record<string, string> = {};
const UUID_TO_PROJECT_SLUG: Record<string, string> = {};

export const registerProject = (config: ProjectConfig) => {
  projects[config.id] = config;
  const targetId = config.uuid || config.id;
  if (config.uuid) {
    projects[config.uuid] = config;
    PROJECT_ALIAS_TO_UUID[config.id.toLowerCase()] = config.uuid;
  }
  if (config.code) {
    const cleanCode = config.code.toLowerCase().trim();
    PROJECT_ALIAS_TO_UUID[cleanCode] = targetId;
    PROJECT_ALIAS_TO_UUID[cleanCode.replace(/_/g, "-")] = targetId;
    PROJECT_ALIAS_TO_UUID[cleanCode.replace(/-/g, "_")] = targetId;
    UUID_TO_PROJECT_SLUG[targetId.toLowerCase()] = cleanCode.replace(/_/g, "-");
    UUID_TO_PROJECT_SLUG[config.id.toLowerCase()] = cleanCode.replace(/_/g, "-");
  }
  if (config.domain) {
    const cleanDomain = config.domain.split(":")[0].toLowerCase();
    PROJECT_ALIAS_TO_UUID[cleanDomain] = targetId;
    const subdomain = cleanDomain.split(".")[0];
    if (subdomain && subdomain !== "localhost") {
      PROJECT_ALIAS_TO_UUID[subdomain] = targetId;
      PROJECT_ALIAS_TO_UUID[subdomain.replace(/-/g, "_")] = targetId;
      PROJECT_ALIAS_TO_UUID[subdomain.replace(/_/g, "-")] = targetId;
      if (!UUID_TO_PROJECT_SLUG[targetId.toLowerCase()]) {
        UUID_TO_PROJECT_SLUG[targetId.toLowerCase()] = subdomain.replace(/_/g, "-");
      }
    }
  }
  if (config.name) {
    const slugName = config.name.toLowerCase().replace(/\s+/g, "_");
    const hyphenName = config.name.toLowerCase().replace(/\s+/g, "-");
    PROJECT_ALIAS_TO_UUID[slugName] = targetId;
    PROJECT_ALIAS_TO_UUID[hyphenName] = targetId;
    PROJECT_ALIAS_TO_UUID[config.name.toLowerCase()] = targetId;
  }
};

export const registerProjectAlias = (code: string, uuid: string) => {
  if (!code || !uuid) return;
  const cleanCode = code.toLowerCase().trim();
  const cleanUuid = uuid.toLowerCase().trim();
  PROJECT_ALIAS_TO_UUID[cleanCode] = cleanUuid;
  PROJECT_ALIAS_TO_UUID[cleanCode.replace(/_/g, "-")] = cleanUuid;
  PROJECT_ALIAS_TO_UUID[cleanCode.replace(/-/g, "_")] = cleanUuid;
  UUID_TO_PROJECT_SLUG[cleanUuid] = cleanCode.replace(/_/g, "-");
};

export const unregisterProject = (id: string) => {
  const cleanId = id.toLowerCase();
  const conf = projects[cleanId];
  delete projects[cleanId];
  const mappedUuid = PROJECT_ALIAS_TO_UUID[cleanId];
  if (mappedUuid) {
    delete projects[mappedUuid];
    delete UUID_TO_PROJECT_SLUG[mappedUuid.toLowerCase()];
  }
  delete UUID_TO_PROJECT_SLUG[cleanId];
  if (conf?.code) {
    const cleanCode = conf.code.toLowerCase().trim();
    delete PROJECT_ALIAS_TO_UUID[cleanCode];
    delete PROJECT_ALIAS_TO_UUID[cleanCode.replace(/_/g, "-")];
    delete PROJECT_ALIAS_TO_UUID[cleanCode.replace(/-/g, "_")];
  }
};

export const resolveProjectUuid = (projectIdOrSlug?: string): string => {
  if (!projectIdOrSlug) {
    const all = Object.values(projects);
    return all.length > 0 ? (all[0].uuid || all[0].id) : DEFAULT_PROJECT;
  }
  const clean = projectIdOrSlug.trim().toLowerCase();
  if (isUuid(clean)) return clean;
  if (PROJECT_ALIAS_TO_UUID[clean]) return PROJECT_ALIAS_TO_UUID[clean];
  if (PROJECT_ALIAS_TO_UUID[clean.replace(/_/g, "-")]) return PROJECT_ALIAS_TO_UUID[clean.replace(/_/g, "-")];
  if (PROJECT_ALIAS_TO_UUID[clean.replace(/-/g, "_")]) return PROJECT_ALIAS_TO_UUID[clean.replace(/-/g, "_")];

  const registered = Object.values(projects).find((p) => {
    return (
      p.id.toLowerCase() === clean ||
      p.uuid?.toLowerCase() === clean ||
      p.code?.toLowerCase() === clean ||
      p.code?.toLowerCase().replace(/_/g, "-") === clean.replace(/_/g, "-") ||
      p.code?.toLowerCase().replace(/-/g, "_") === clean.replace(/-/g, "_") ||
      p.domain?.toLowerCase() === clean ||
      p.domain?.toLowerCase() === `${clean}.localhost` ||
      p.name?.toLowerCase() === clean ||
      p.name?.toLowerCase().replace(/\s+/g, "_") === clean
    );
  });

  if (registered) {
    return registered.uuid || registered.id;
  }

  return projectIdOrSlug;
};

export const isIpAddress = (host?: string): boolean => {
  if (!host) return false;
  const clean = host.split(":")[0];
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(clean);
};

export const resolveProjectSlug = (idOrUuid?: string): string => {
  if (!idOrUuid || typeof idOrUuid !== "string" || idOrUuid.toLowerCase().includes("[object")) {
    const all = Object.values(projects);
    if (all.length > 0 && all[0].code) {
      return all[0].code.toLowerCase().replace(/_/g, "-");
    }
    return (process.env.DEFAULT_PROJECT_CODE || "project-a").toLowerCase().replace(/_/g, "-");
  }
  const clean = idOrUuid.trim().toLowerCase();
  if (UUID_TO_PROJECT_SLUG[clean]) {
    return UUID_TO_PROJECT_SLUG[clean];
  }
  if (clean.startsWith("project-") || clean.startsWith("project_")) {
    return clean.replace(/_/g, "-");
  }
  const mappedUuid = PROJECT_ALIAS_TO_UUID[clean];
  if (mappedUuid && UUID_TO_PROJECT_SLUG[mappedUuid]) {
    return UUID_TO_PROJECT_SLUG[mappedUuid];
  }
  if (projects[clean]?.code) {
    return projects[clean].code.toLowerCase().replace(/_/g, "-");
  }
  const found = Object.values(projects).find(
    (p) => p.uuid?.toLowerCase() === clean || p.id.toLowerCase() === clean
  );
  if (found?.code) {
    return found.code.toLowerCase().replace(/_/g, "-");
  }
  if (found?.domain) {
    const sub = found.domain.split(".")[0];
    if (sub && sub !== "localhost") {
      return sub.replace(/_/g, "-");
    }
  }
  if (!clean.includes(".") && !isUuid(clean)) {
    return clean.replace(/_/g, "-");
  }
  const all = Object.values(projects);
  if (all.length > 0 && all[0].code) {
    return all[0].code.toLowerCase().replace(/_/g, "-");
  }
  return clean;
};

export const DEFAULT_PROJECT = process.env.DEFAULT_PROJECT || process.env.DEFAULT_PROJECT_ID || "project-a";

export const createDynamicProject = (projectId: string, customCode?: string): ProjectConfig => {
  const code = customCode || resolveProjectSlug(projectId) || projectId;
  return defineProject({
    id: projectId,
    code,
    name: code,
    domain: `${code}.localhost`,
    color: "skyblue",
  });
};

export const getProjectById = (
  projectId: string,
  allowDynamic = true
): ProjectConfig | undefined => {
  if (!projectId) return undefined;
  if (projects[projectId]) {
    return projects[projectId];
  }
  const resolvedUuid = resolveProjectUuid(projectId);
  if (projects[resolvedUuid]) {
    return projects[resolvedUuid];
  }
  const clean = projectId.toLowerCase();
  const foundByCode = Object.values(projects).find(
    (p) =>
      p.code?.toLowerCase() === clean ||
      p.code?.toLowerCase().replace(/_/g, "-") === clean.replace(/_/g, "-")
  );
  if (foundByCode) {
    return foundByCode;
  }
  if (allowDynamic && /^[a-zA-Z0-9_-]+$/.test(projectId)) {
    return createDynamicProject(projectId);
  }
  return undefined;
};

export const getProjectByDomain = (domain: string): ProjectConfig | undefined => {
  const cleanDomain = domain.split(":")[0].toLowerCase();
  return Object.values(projects).find(
    (p) => p.domain.toLowerCase() === cleanDomain
  );
};

export const getAllProjects = (): ProjectConfig[] => Object.values(projects);

export default projects;
