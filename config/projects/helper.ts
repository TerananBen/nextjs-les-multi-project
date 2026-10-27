import type {
  ColorPreset,
  DefineProjectInput,
  ProjectConfig,
} from "./types";

export interface ProjectTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  sidebarColor?: string;
  sidebarForeground?: string;
  sidebarAccent?: string;
}

export const COLOR_PRESETS: Record<ColorPreset, ProjectTheme> = {
  blue: {
    primaryColor: "oklch(0.65 0.12 245)",
    secondaryColor: "oklch(0.95 0.02 245)",
    accentColor: "oklch(0.92 0.03 245)",
    backgroundColor: "oklch(0.98 0.01 245)",
    textColor: "oklch(0.25 0.03 245)",
    sidebarColor: "#2563eb",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#1d4ed8",
  },
  skyblue: {
    primaryColor: "oklch(0.67 0.12 235)",
    secondaryColor: "oklch(0.95 0.02 235)",
    accentColor: "oklch(0.92 0.03 235)",
    backgroundColor: "oklch(0.98 0.01 235)",
    textColor: "oklch(0.25 0.03 235)",
    sidebarColor: "#0284c7",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#0369a1",
  },
  green: {
    primaryColor: "oklch(0.65 0.11 160)",
    secondaryColor: "oklch(0.95 0.02 160)",
    accentColor: "oklch(0.92 0.03 160)",
    backgroundColor: "oklch(0.98 0.01 160)",
    textColor: "oklch(0.25 0.03 160)",
    sidebarColor: "#059669",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#047857",
  },
  purple: {
    primaryColor: "oklch(0.64 0.12 295)",
    secondaryColor: "oklch(0.95 0.02 295)",
    accentColor: "oklch(0.92 0.03 295)",
    backgroundColor: "oklch(0.98 0.01 295)",
    textColor: "oklch(0.25 0.03 295)",
    sidebarColor: "#7c3aed",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#6d28d9",
  },
  amber: {
    primaryColor: "oklch(0.72 0.11 75)",
    secondaryColor: "oklch(0.95 0.02 75)",
    accentColor: "oklch(0.92 0.03 75)",
    backgroundColor: "oklch(0.98 0.01 75)",
    textColor: "oklch(0.25 0.03 75)",
    sidebarColor: "#d97706",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#b45309",
  },
  rose: {
    primaryColor: "oklch(0.66 0.12 15)",
    secondaryColor: "oklch(0.95 0.02 15)",
    accentColor: "oklch(0.92 0.03 15)",
    backgroundColor: "oklch(0.98 0.01 15)",
    textColor: "oklch(0.25 0.03 15)",
    sidebarColor: "#e11d48",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#be123c",
  },
  indigo: {
    primaryColor: "oklch(0.63 0.12 270)",
    secondaryColor: "oklch(0.95 0.02 270)",
    accentColor: "oklch(0.92 0.03 270)",
    backgroundColor: "oklch(0.98 0.01 270)",
    textColor: "oklch(0.25 0.03 270)",
    sidebarColor: "#4f46e5",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#4338ca",
  },
  emerald: {
    primaryColor: "oklch(0.65 0.10 175)",
    secondaryColor: "oklch(0.95 0.02 175)",
    accentColor: "oklch(0.92 0.03 175)",
    backgroundColor: "oklch(0.98 0.01 175)",
    textColor: "oklch(0.25 0.03 175)",
    sidebarColor: "#0d9488",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#0f766e",
  },
  slate: {
    primaryColor: "oklch(0.55 0.02 260)",
    secondaryColor: "oklch(0.95 0.01 260)",
    accentColor: "oklch(0.92 0.01 260)",
    backgroundColor: "oklch(0.98 0.01 260)",
    textColor: "oklch(0.25 0.01 260)",
    sidebarColor: "#475569",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#334155",
  },
};

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const defineProject = (input: DefineProjectInput): ProjectConfig => {
  const id = input.id || slugify(input.name);

  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(
      `Invalid project ID "${id}". Must contain only letters, numbers, hyphens, and underscores.`
    );
  }

  const domain = input.domain || `${id}.localhost`;
  const code = input.code || (domain ? domain.split('.')[0] : id);
  const logo = input.logo || "/logo-le-full.svg";
  const appIcon = input.appIcon || "/logo-le.svg";
  const color = input.color || "skyblue";

  return {
    id,
    uuid: input.uuid,
    code,
    name: input.name,
    domain,
    logo,
    appIcon,
    color,
    enableLoginOtp: input.enableLoginOtp ?? false,
  };
};

const VALID_COLORS = new Set<string>([
  "blue",
  "green",
  "purple",
  "amber",
  "rose",
  "indigo",
  "emerald",
  "slate",
  "skyblue",
]);

export interface NestProjectRaw {
  id: string;
  code?: string;
  name: string;
  domain?: string;
  logo?: string;
  sidebar_logo?: string;
  app_icon?: string;
  appIcon?: string;
  favicon_logo?: string;
  color?: string;
  enableLoginOtp?: boolean;
  enable_login_otp?: boolean;
}

export const normalizeNestProject = (p: NestProjectRaw): ProjectConfig => {
  const isImage = (val?: string) =>
    Boolean(
      val &&
        (val.startsWith("/") ||
          val.startsWith("http") ||
          val.endsWith(".svg") ||
          val.endsWith(".png") ||
          val.endsWith(".ico") ||
          val.endsWith(".jpg"))
    );
  const isColor = (val?: string) => Boolean(val && VALID_COLORS.has(val));

  let color: ColorPreset = "skyblue";
  if (isColor(p.color)) color = p.color as ColorPreset;
  else if (isColor(p.favicon_logo)) color = p.favicon_logo as ColorPreset;

  let logo = "/logo-le-full.svg";
  if (isImage(p.logo)) logo = p.logo!;
  else if (isImage(p.sidebar_logo)) logo = p.sidebar_logo!;
  else if (isImage(p.color)) logo = p.color!;

  let appIcon = "/logo-le.svg";
  if (isImage(p.appIcon)) appIcon = p.appIcon!;
  else if (isImage(p.app_icon)) appIcon = p.app_icon!;
  else if (isImage(p.favicon_logo)) appIcon = p.favicon_logo!;
  else if (isImage(p.sidebar_logo)) appIcon = p.sidebar_logo!;

  const code = p.code || (p.domain ? p.domain.split('.')[0] : p.id);

  return {
    id: p.id,
    uuid: p.id,
    code,
    name: p.name,
    domain: p.domain || `${p.id}.localhost`,
    logo,
    appIcon,
    color,
    enableLoginOtp: p.enableLoginOtp ?? p.enable_login_otp ?? false,
  };
};

// Backward compatibility alias
export const defineTenant = defineProject;
