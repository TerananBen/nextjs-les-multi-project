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
  colorOrTheme?: ColorPreset | ProjectTheme | string
): React.CSSProperties => {
  let theme: ProjectTheme;
  if (!colorOrTheme) {
    theme = COLOR_PRESETS.blue;
  } else if (typeof colorOrTheme === "string") {
    if (colorOrTheme === "#a32828" || colorOrTheme === "red") {
      theme = COLOR_PRESETS.red;
    } else if (colorOrTheme === "#b95387" || colorOrTheme === "rose" || colorOrTheme === "pink") {
      theme = COLOR_PRESETS.rose;
    } else if (colorOrTheme === "#bf5800" || colorOrTheme === "orange") {
      theme = COLOR_PRESETS.orange;
    } else if (colorOrTheme === "#45a976" || colorOrTheme === "#45a9a4" || colorOrTheme === "green" || colorOrTheme === "teal") {
      theme = COLOR_PRESETS.green;
    } else if (colorOrTheme === "#429ec1" || colorOrTheme === "cyan") {
      theme = COLOR_PRESETS.cyan;
    } else if (colorOrTheme === "#001941" || colorOrTheme === "navy") {
      theme = COLOR_PRESETS.navy;
    } else if (colorOrTheme === "#4b4b4b" || colorOrTheme === "charcoal" || colorOrTheme === "gray") {
      theme = COLOR_PRESETS.charcoal;
    } else {
      theme = COLOR_PRESETS[colorOrTheme as ColorPreset] || COLOR_PRESETS.blue;
    }
  } else {
    theme = colorOrTheme;
  }
  return themeToCssVars(theme) as unknown as React.CSSProperties;
};
