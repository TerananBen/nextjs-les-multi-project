"use client";

import { createContext, useContext } from "react";
import type { ProjectConfig } from "@/config/projects";

interface ProjectContextValue {
  projectCode: string;
  projectId: string;
  config: ProjectConfig;
  // Backward compatibility alias
  tenantId?: string;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export const ProjectProvider = ({
  children,
  projectId,
  config,
}: {
  children: React.ReactNode;
  projectId: string;
  config: ProjectConfig;
}) => {
  const code = config?.code || projectId;
  return (
    <ProjectContext.Provider value={{ projectCode: code, projectId, tenantId: projectId, config }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextValue => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
};
