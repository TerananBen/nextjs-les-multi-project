export interface PipelineProjectItem {
    id: string
    projectId: string
    projectName?: string
    displayName?: string
    startTime?: string
    dailyTimes?: string | string[]
    createdAt?: string
    lastRunAt?: string
    lastRunStatus?: string
    status?: string
    usable?: string // "Y" | "N"
    isActive?: boolean
    isEnabled?: boolean
    hasCustomTime?: boolean
    retentionDays?: number
    wattOver?: number
    wattLess?: number
    voltOver?: number
    voltLess?: number
    timeZoneId?: string
}

export interface DashboardPipelineItem {
    id: string
    name: string
    description?: string
    jobType?: string
    scheduleType: string
    dailyTimes: string | string[]
    staggerDelaySeconds: number
    timeZoneId?: string
    maxConcurrentProjects?: number
    createdAt?: string
    lastRunAt?: string
    lastRunStatus?: string
    status?: string
    usable?: string // "Y" | "N"
    isActive?: boolean
    isEnabled?: boolean
    projects: PipelineProjectItem[]
    // Fallback fields from different API structures
    pipelineId?: string
    project_id?: string
    project_name?: string
    display_name?: string
}

export interface SavePipelineProjectInput {
    id?: string
    projectId: string
    projectName?: string
    displayName: string
    dailyTimes?: string
    startTime?: string
    hasCustomTime?: boolean
    isEnabled?: boolean
    retentionDays?: number
    wattOver?: number
    wattLess?: number
    voltOver?: number
    voltLess?: number
    timeZoneId?: string
}

export interface SavePipelineScheduleParams {
    id?: string
    name: string
    description?: string
    jobType?: string
    scheduleType: string
    dailyTimes: string
    staggerDelaySeconds: number
    timeZoneId?: string
    maxConcurrentProjects?: number
    isEnabled?: boolean
    projects: SavePipelineProjectInput[]
}

export interface PipelineLogItem {
    id: number | string
    projectName?: string
    targetDate?: string
    status?: string
    step1Status?: string
    step1ItemCount?: number
    step2Status?: string
    step2ItemCount?: number
    step3Status?: string
    step3GroupCount?: number
    durationMs?: number
    errorMessage?: string
    executedAt?: string
    projectId?: number | string
    stepName?: string
    step?: string
    recordsProcessed?: number
    executionTimeMs?: number
    message?: string
    startedAt?: string
    createdAt?: string
    completedAt?: string
}

export interface DateActionConfirmPayload {
    startDate: string
    endDate: string
    targetDate?: string
    isSingleDay?: boolean
    reprocessDashboard?: boolean
    projectId?: string
}
