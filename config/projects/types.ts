export type ColorPreset =
  | "blue"
  | "green"
  | "purple"
  | "amber"
  | "rose"
  | "indigo"
  | "emerald"
  | "slate"
  | "skyblue";

export interface ProjectConfig {
  id: string;
  uuid?: string;
  code?: string;
  name: string;
  domain: string;
  logo: string;
  appIcon: string;
  color: ColorPreset;
  enableLoginOtp?: boolean;
}

export interface DefineProjectInput {
  name: string;
  id?: string;
  uuid?: string;
  code?: string;
  domain?: string;
  logo?: string;
  appIcon?: string;
  color?: ColorPreset;
  enableLoginOtp?: boolean;
}

// Backward compatibility aliases
export type TenantConfig = ProjectConfig;
export type DefineTenantInput = DefineProjectInput;

