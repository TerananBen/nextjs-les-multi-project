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
    primaryColor: "oklch(0.62 0.13 250)",
    secondaryColor: "oklch(0.96 0.02 250)",
    accentColor: "oklch(0.93 0.03 250)",
    backgroundColor: "oklch(0.98 0.01 250)",
    textColor: "oklch(0.25 0.03 250)",
    sidebarColor: "#3072f1",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#1d4ed8",
  },
  skyblue: {
    primaryColor: "oklch(0.65 0.12 235)",
    secondaryColor: "oklch(0.96 0.02 235)",
    accentColor: "oklch(0.93 0.03 235)",
    backgroundColor: "oklch(0.98 0.01 235)",
    textColor: "oklch(0.25 0.03 235)",
    sidebarColor: "#0895d8",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#0284c7",
  },
  green: {
    primaryColor: "oklch(0.66 0.12 158)",
    secondaryColor: "oklch(0.96 0.02 158)",
    accentColor: "oklch(0.93 0.02 158)",
    backgroundColor: "oklch(0.98 0.01 158)",
    textColor: "oklch(0.25 0.03 158)",
    sidebarColor: "#45a976",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#37875e",
  },
  purple: {
    primaryColor: "oklch(0.62 0.13 295)",
    secondaryColor: "oklch(0.96 0.02 295)",
    accentColor: "oklch(0.93 0.03 295)",
    backgroundColor: "oklch(0.98 0.01 295)",
    textColor: "oklch(0.25 0.03 295)",
    sidebarColor: "#9e44f1",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#7e22ce",
  },
  amber: {
    primaryColor: "oklch(0.70 0.12 75)",
    secondaryColor: "oklch(0.96 0.02 75)",
    accentColor: "oklch(0.93 0.03 75)",
    backgroundColor: "oklch(0.98 0.01 75)",
    textColor: "oklch(0.25 0.03 75)",
    sidebarColor: "#e78b08",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#b45309",
  },
  rose: {
    primaryColor: "oklch(0.59 0.14 350)",
    secondaryColor: "oklch(0.96 0.02 350)",
    accentColor: "oklch(0.93 0.02 350)",
    backgroundColor: "oklch(0.98 0.01 350)",
    textColor: "oklch(0.25 0.03 350)",
    sidebarColor: "#b95387",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#94426c",
  },
  pink: {
    primaryColor: "oklch(0.59 0.14 350)",
    secondaryColor: "oklch(0.96 0.02 350)",
    accentColor: "oklch(0.93 0.02 350)",
    backgroundColor: "oklch(0.98 0.01 350)",
    textColor: "oklch(0.25 0.03 350)",
    sidebarColor: "#b95387",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#94426c",
  },
  indigo: {
    primaryColor: "oklch(0.61 0.13 270)",
    secondaryColor: "oklch(0.96 0.02 270)",
    accentColor: "oklch(0.93 0.02 270)",
    backgroundColor: "oklch(0.98 0.01 270)",
    textColor: "oklch(0.25 0.03 270)",
    sidebarColor: "#5956eb",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#4338ca",
  },
  emerald: {
    primaryColor: "oklch(0.64 0.11 175)",
    secondaryColor: "oklch(0.96 0.02 175)",
    accentColor: "oklch(0.93 0.03 175)",
    backgroundColor: "oklch(0.98 0.01 175)",
    textColor: "oklch(0.25 0.03 175)",
    sidebarColor: "#10a697",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#0f766e",
  },
  slate: {
    primaryColor: "oklch(0.58 0.02 260)",
    secondaryColor: "oklch(0.96 0.01 260)",
    accentColor: "oklch(0.93 0.01 260)",
    backgroundColor: "oklch(0.98 0.01 260)",
    textColor: "oklch(0.25 0.01 260)",
    sidebarColor: "#56647a",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#334155",
  },
  red: {
    primaryColor: "oklch(0.55 0.16 25)",
    secondaryColor: "oklch(0.96 0.02 25)",
    accentColor: "oklch(0.93 0.02 25)",
    backgroundColor: "oklch(0.98 0.01 25)",
    textColor: "oklch(0.25 0.03 25)",
    sidebarColor: "#a32828",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#831f1f",
  },
  orange: {
    primaryColor: "oklch(0.58 0.15 50)",
    secondaryColor: "oklch(0.96 0.02 50)",
    accentColor: "oklch(0.93 0.03 50)",
    backgroundColor: "oklch(0.98 0.01 50)",
    textColor: "oklch(0.25 0.03 50)",
    sidebarColor: "#bf5800",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#984600",
  },
  teal: {
    primaryColor: "oklch(0.66 0.12 158)",
    secondaryColor: "oklch(0.96 0.02 158)",
    accentColor: "oklch(0.93 0.02 158)",
    backgroundColor: "oklch(0.98 0.01 158)",
    textColor: "oklch(0.25 0.03 158)",
    sidebarColor: "#45a976",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#37875e",
  },
  cyan: {
    primaryColor: "oklch(0.64 0.11 227)",
    secondaryColor: "oklch(0.96 0.02 227)",
    accentColor: "oklch(0.93 0.02 227)",
    backgroundColor: "oklch(0.98 0.01 227)",
    textColor: "oklch(0.25 0.03 227)",
    sidebarColor: "#429ec1",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#347e9a",
  },
  navy: {
    primaryColor: "oklch(0.35 0.10 258)",
    secondaryColor: "oklch(0.96 0.02 258)",
    accentColor: "oklch(0.93 0.02 258)",
    backgroundColor: "oklch(0.98 0.01 258)",
    textColor: "oklch(0.20 0.03 258)",
    sidebarColor: "#001941",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#00122e",
  },
  charcoal: {
    primaryColor: "oklch(0.45 0.01 90)",
    secondaryColor: "oklch(0.96 0.01 90)",
    accentColor: "oklch(0.93 0.01 90)",
    backgroundColor: "oklch(0.98 0.01 90)",
    textColor: "oklch(0.20 0.01 90)",
    sidebarColor: "#4b4b4b",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#383838",
  },
  gray: {
    primaryColor: "oklch(0.45 0.01 90)",
    secondaryColor: "oklch(0.96 0.01 90)",
    accentColor: "oklch(0.93 0.01 90)",
    backgroundColor: "oklch(0.98 0.01 90)",
    textColor: "oklch(0.20 0.01 90)",
    sidebarColor: "#4b4b4b",
    sidebarForeground: "#ffffff",
    sidebarAccent: "#383838",
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
  const color = input.color || "blue";

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
  "red",
  "orange",
  "teal",
  "cyan",
  "pink",
  "navy",
  "charcoal",
  "gray",
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

  let color: ColorPreset = "blue";
  if (p.color === "#a32828" || p.color === "red") color = "red";
  else if (p.color === "#b95387" || p.color === "rose" || p.color === "pink") color = "rose";
  else if (p.color === "#bf5800" || p.color === "orange") color = "orange";
  else if (p.color === "#45a976" || p.color === "#45a9a4" || p.color === "green" || p.color === "teal") color = "green";
  else if (p.color === "#429ec1" || p.color === "cyan") color = "cyan";
  else if (p.color === "#001941" || p.color === "navy") color = "navy";
  else if (p.color === "#4b4b4b" || p.color === "charcoal" || p.color === "gray") color = "charcoal";
  else if (isColor(p.color)) color = p.color as ColorPreset;
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
