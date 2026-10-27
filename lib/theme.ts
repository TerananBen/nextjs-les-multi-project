import { COLOR_PRESETS, type ColorPreset, type ProjectTheme } from "@/config/projects";

export const themeToCssVars = (theme: ProjectTheme): Record<string, string> => ({
  "--project-primary": theme.primaryColor,
  "--project-secondary": theme.secondaryColor,
  "--project-accent": theme.accentColor,
  "--project-bg": theme.backgroundColor,
  "--project-text": theme.textColor,
  ...(theme.sidebarColor
    ? {
      "--project-sidebar": theme.sidebarColor,
    }
    : {}),
  ...(theme.sidebarForeground
    ? {
      "--project-sidebar-foreground": theme.sidebarForeground,
    }
    : {}),
  ...(theme.sidebarAccent
    ? {
      "--project-sidebar-accent": theme.sidebarAccent,
    }
    : {}),
});

export const getThemeStyle = (
  colorOrTheme?: ColorPreset | ProjectTheme
): React.CSSProperties => {
  let theme: ProjectTheme;
  if (!colorOrTheme) {
    theme = COLOR_PRESETS.skyblue;
  } else if (typeof colorOrTheme === "string") {
    theme = COLOR_PRESETS[colorOrTheme] || COLOR_PRESETS.skyblue;
  } else {
    theme = colorOrTheme;
  }
  return themeToCssVars(theme) as unknown as React.CSSProperties;
};
