import type { JSX, ReactNode } from "react";
import {
  generatedCustoms,
  generatedSharedRegistry,
} from "./component-registry.generated";

export const renderProjectComponent = <
  P extends Record<string, unknown> = Record<string, unknown>
>(
  componentName: string,
  projectCodeOrId: string,
  props?: P
): JSX.Element | null => {
  if (!projectCodeOrId) return null;

  // 1. Check for project-specific custom component (supports exact, uppercase, or lowercase code)
  const cleanCode = projectCodeOrId.trim();
  const projectCustoms =
    generatedCustoms[cleanCode] ||
    generatedCustoms[cleanCode.toUpperCase()] ||
    generatedCustoms[cleanCode.toLowerCase()];

  if (projectCustoms && projectCustoms[componentName]) {
    const CustomComponent = projectCustoms[componentName];
    return <CustomComponent {...(props || ({} as P))} />;
  }

  // 2. Fall back to shared component
  const SharedComponent = generatedSharedRegistry[componentName];
  if (SharedComponent) {
    return <SharedComponent {...(props || ({} as P))} />;
  }

  // 3. Return null if not defined anywhere
  return null;
};

interface ProjectComponentProps<P extends Record<string, unknown>> {
  name: string;
  projectCode?: string;
  projectId?: string;
  tenantId?: string;
  props?: P;
  fallback?: ReactNode;
}

export const ProjectComponent = <
  P extends Record<string, unknown> = Record<string, unknown>
>({
  name,
  projectCode,
  projectId,
  tenantId,
  props,
  fallback = null,
}: ProjectComponentProps<P>): JSX.Element | null => {
  const activeIdentifier = projectCode || projectId || tenantId || "";
  const rendered = renderProjectComponent(name, activeIdentifier, props);
  if (rendered) {
    return rendered;
  }
  return fallback as JSX.Element | null;
};
