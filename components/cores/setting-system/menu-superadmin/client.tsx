"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Folders, Clock, Code2, ShieldAlert } from "lucide-react"

import { ProjectsTab } from "./projects-tab"
import { PipelineScheduleClient } from "@/components/cores/setting-system/pipeline-schedule/client"
import { ApiTab } from "./api-tab"

import type { DashboardPipelineItem, PipelineProjectItem } from "@/types/pipeline-schedule"
import type { ProjectConfig } from "@/config/projects/types"
import type { ApiMenuSetting } from "@/types/api-settings"

interface MenuSuperadminClientProps {
  initialPipelineData: DashboardPipelineItem[]
  initialPipelineProjects?: PipelineProjectItem[]
  projects: ProjectConfig[]
  initialApiSettings: ApiMenuSetting[]
  initialProjectId?: string
  isSuperAdmin?: boolean
}

export function MenuSuperadminClient({
  initialPipelineData = [],
  initialPipelineProjects = [],
  projects = [],
  initialApiSettings = [],
  initialProjectId,
  isSuperAdmin = false,
}: MenuSuperadminClientProps) {
  const t = useTranslations("MenuSuperadmin")
  const [activeTab, setActiveTab] = React.useState<string>("projects")

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
        <ShieldAlert className="h-12 w-12 text-muted-foreground/60" />
        <p className="text-base font-medium">{t("noAccess")}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-2.5 w-full h-full">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full flex-1 flex flex-col gap-2.5"
      >
        <div className="flex items-center justify-center w-full">
          <TabsList className="h-9 p-1 bg-muted/60">
            <TabsTrigger
              value="projects"
              className="h-7.5 text-xs sm:text-sm px-4 cursor-pointer gap-2 data-[state=active]:bg-background"
            >
              <Folders className="h-4 w-4" />
              {t("tabs.projects")}
            </TabsTrigger>
            <TabsTrigger
              value="pipeline"
              className="h-7.5 text-xs sm:text-sm px-4 cursor-pointer gap-2 data-[state=active]:bg-background"
            >
              <Clock className="h-4 w-4" />
              {t("tabs.pipeline")}
            </TabsTrigger>
            <TabsTrigger
              value="apiSettings"
              className="h-7.5 text-xs sm:text-sm px-4 cursor-pointer gap-2 data-[state=active]:bg-background"
            >
              <Code2 className="h-4 w-4" />
              {t("tabs.apiSettings")}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="projects" className="mt-0 flex-1 flex flex-col">
          <ProjectsTab initialData={projects} />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-0 flex-1 flex flex-col">
          <PipelineScheduleClient
            initialData={initialPipelineData}
            initialPipelineProjects={initialPipelineProjects}
            projects={projects}
            isSuperAdmin={isSuperAdmin}
          />
        </TabsContent>

        <TabsContent value="apiSettings" className="mt-0 flex-1 flex flex-col">
          <ApiTab
            initialData={initialApiSettings}
            projects={projects}
            initialProjectId={initialProjectId}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
