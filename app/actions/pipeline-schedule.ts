"use server"

import { revalidatePath } from "next/cache"
import { fetchLesApi } from "@/lib/les-api"
import type {
  DashboardPipelineItem,
  PipelineProjectItem,
  SavePipelineScheduleParams,
  PipelineLogItem,
} from "@/types/pipeline-schedule"

interface ApiResult<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

interface RawScheduleResponse {
  id?: number | string
  name?: string
  description?: string
  jobType?: string
  job_type?: string
  scheduleType?: string
  schedule_type?: string
  dailyTimes?: string | string[]
  daily_times?: string | string[]
  time?: string
  staggerDelaySeconds?: number | string
  stagger_delay_seconds?: number | string
  timeZoneId?: string
  time_zone_id?: string
  maxConcurrentProjects?: number
  max_concurrent_projects?: number
  isEnabled?: boolean
  is_enabled?: boolean
  isActive?: boolean
  is_active?: boolean
  usable?: string
  createdAt?: string
  created_at?: string
  lastRunAt?: string
  last_run_at?: string
  lastRunStatus?: string
  last_run_status?: string
  lastRunMessage?: string
  last_run_message?: string
  projects?: unknown[]
  [key: string]: unknown
}

interface RawProjectResponse {
  id?: number | string
  projectName?: string
  project_name?: string
  projectId?: string
  project_id?: string
  displayName?: string
  display_name?: string
  startTime?: string
  start_time?: string
  dailyTimes?: string | string[]
  daily_times?: string | string[]
  isEnabled?: boolean
  is_enabled?: boolean
  isActive?: boolean
  is_active?: boolean
  usable?: string
  createdAt?: string
  created_at?: string
  lastRunAt?: string
  last_run_at?: string
  lastRunStatus?: string
  last_run_status?: string
  [key: string]: unknown
}

/**
 * Item 2: Fetch Master Pipeline Schedules using GET /api/schedule/dashboard-pipelines
 */
export async function getPipelineSchedules(): Promise<DashboardPipelineItem[]> {
  try {
    const response = await fetchLesApi<
      RawScheduleResponse[] | { data?: RawScheduleResponse[]; result?: boolean }
    >("/api/schedule/dashboard-pipelines", { method: "GET" })

    let rawList: RawScheduleResponse[] = []
    if (Array.isArray(response)) {
      rawList = response
    } else if (response && Array.isArray((response as { data?: RawScheduleResponse[] }).data)) {
      rawList = (response as { data?: RawScheduleResponse[] }).data || []
    }

    return rawList.map((item, idx): DashboardPipelineItem => {
      const rawId = String(item.id || `schedule-${idx + 1}`)
      const name = item.name || `Schedule ${idx + 1}`
      const description = item.description || ""
      const jobType = item.jobType || item.job_type || "DashboardPipeline"
      const scheduleType = item.scheduleType || item.schedule_type || "Daily"
      const dailyTimes = item.dailyTimes || item.daily_times || item.time || "01:00"
      const staggerDelaySeconds = Number(
        item.staggerDelaySeconds || item.stagger_delay_seconds || 0
      )
      const timeZoneId = item.timeZoneId || item.time_zone_id || "SE Asia Standard Time"
      const maxConcurrentProjects = Number(
        item.maxConcurrentProjects || item.max_concurrent_projects || 0
      )
      const createdAt = item.createdAt || item.created_at
      const lastRunAt = item.lastRunAt || item.last_run_at
      const lastRunStatus = item.lastRunStatus || item.last_run_status
      const isEnabled =
        item.isEnabled ??
        item.is_enabled ??
        (item.usable === "Y" || item.isActive === true || item.is_active === true)
      const usable = isEnabled ? "Y" : "N"
      const isActive = Boolean(isEnabled)

      return {
        id: rawId,
        name,
        description,
        jobType,
        scheduleType,
        dailyTimes,
        staggerDelaySeconds,
        timeZoneId,
        maxConcurrentProjects,
        createdAt,
        lastRunAt,
        lastRunStatus,
        status: lastRunStatus,
        usable,
        isActive,
        isEnabled: isActive,
        projects: [],
      }
    })
  } catch (error) {
    console.error("Error fetching pipeline schedules:", error)
    return []
  }
}

/**
 * Item 3: Fetch Pipeline Projects using GET /api/schedule/dashboard-pipelines/projects
 */
export async function getPipelineProjects(projectName?: string): Promise<PipelineProjectItem[]> {
  try {
    const query =
      projectName && projectName !== "ALL" ? `?projectName=${encodeURIComponent(projectName)}` : ""
    const response = await fetchLesApi<
      RawProjectResponse[] | { data?: RawProjectResponse[]; result?: boolean }
    >(`/api/schedule/dashboard-pipelines/projects${query}`, { method: "GET" })

    let rawList: RawProjectResponse[] = []
    if (Array.isArray(response)) {
      rawList = response
    } else if (response && Array.isArray((response as { data?: RawProjectResponse[] }).data)) {
      rawList = (response as { data?: RawProjectResponse[] }).data || []
    }

    return rawList.map((p, idx): PipelineProjectItem => {
      const id = String(p.id ?? idx + 1)
      const projName = p.projectName || p.project_name || p.projectId || p.project_id || ""
      const displayName = p.displayName || p.display_name || projName
      const rawStartTime = p.startTime || p.start_time
      const hasCustomTime = Boolean(
        rawStartTime && typeof rawStartTime === "string" && rawStartTime.trim() !== ""
      )
      const startTime =
        typeof rawStartTime === "string" && rawStartTime.trim() !== ""
          ? rawStartTime
          : typeof p.dailyTimes === "string"
            ? p.dailyTimes
            : "01:00"
      const isEnabled =
        p.isEnabled ??
        p.is_enabled ??
        (p.usable === "Y" || p.isActive === true || p.is_active === true)
      const usable = isEnabled ? "Y" : "N"
      const isActive = Boolean(isEnabled)
      const createdAt = p.createdAt || p.created_at
      const lastRunAt = p.lastRunAt || p.last_run_at
      const lastRunStatus = p.lastRunStatus || p.last_run_status

      return {
        id,
        projectId: projName || id,
        projectName: projName,
        displayName,
        startTime: typeof startTime === "string" ? startTime : "01:00",
        dailyTimes: typeof startTime === "string" ? startTime : "01:00",
        hasCustomTime,
        createdAt,
        lastRunAt,
        lastRunStatus,
        status: lastRunStatus,
        usable,
        isActive,
        isEnabled: isActive,
      }
    })
  } catch (error) {
    console.error("Error fetching pipeline projects:", error)
    return []
  }
}

/**
 * Toggle Master Pipeline Schedule active/inactive via PATCH /api/schedule/dashboard-pipelines/{id}/toggle
 */
export async function togglePipelineSchedule(id: string): Promise<ApiResult> {
  try {
    const response = await fetchLesApi<{ result?: boolean; success?: boolean; message?: string }>(
      `/api/schedule/dashboard-pipelines/${id}/toggle`,
      { method: "PATCH" }
    )

    revalidatePath("/setting-system/menu-superadmin")
    return {
      success: response?.result ?? response?.success ?? true,
      message: response?.message,
    }
  } catch (error) {
    console.error("Error toggling pipeline schedule status:", error)
    return { success: false, message: "Failed to toggle schedule status" }
  }
}

/**
 * Toggle Project active/inactive via PATCH /api/schedule/dashboard-pipelines/projects/{id}/toggle
 */
export async function togglePipelineProjectStatus(id: string): Promise<ApiResult> {
  try {
    const response = await fetchLesApi<{ result?: boolean; success?: boolean; message?: string }>(
      `/api/schedule/dashboard-pipelines/projects/${id}/toggle`,
      { method: "PATCH" }
    )

    revalidatePath("/setting-system/menu-superadmin")
    return {
      success: response?.result ?? response?.success ?? true,
      message: response?.message,
    }
  } catch (error) {
    console.error("Error toggling pipeline project status:", error)
    return { success: false, message: "Failed to toggle project status" }
  }
}

/**
 * Save Master Pipeline Schedule via POST/PUT /api/schedule/dashboard-pipelines
 */
export async function savePipelineSchedule(
  payload: SavePipelineScheduleParams
): Promise<ApiResult> {
  try {
    const isEdit = Boolean(payload.id)
    const endpoint = isEdit
      ? `/api/schedule/dashboard-pipelines/${payload.id}`
      : "/api/schedule/dashboard-pipelines"
    const method = isEdit ? "PUT" : "POST"

    const projectCount = Array.isArray(payload.projects) ? payload.projects.length : 0
    const maxConcurrentProjects =
      typeof payload.maxConcurrentProjects === "number"
        ? payload.maxConcurrentProjects
        : projectCount

    const scheduleBody: Record<string, unknown> = {
      name: payload.name.trim(),
      description: payload.description?.trim() || "",
      scheduleType: payload.scheduleType || "Daily",
      dailyTimes: payload.dailyTimes || "01:00",
      staggerDelaySeconds: Number(payload.staggerDelaySeconds) || 0,
      jobType: payload.jobType || "DashboardPipeline",
      timeZoneId: "SE Asia Standard Time",
      maxConcurrentProjects: maxConcurrentProjects,
      isEnabled: payload.isEnabled ?? true,
    }

    if (isEdit && payload.id) {
      scheduleBody.id = !isNaN(Number(payload.id)) ? Number(payload.id) : payload.id
    }

    const response = await fetchLesApi<{ result?: boolean; success?: boolean; message?: string }>(
      endpoint,
      {
        method,
        body: JSON.stringify(scheduleBody),
      }
    )

    // Save newly added or updated projects
    if (payload.projects && payload.projects.length > 0) {
      for (const proj of payload.projects) {
        const isExistingProject = proj.id && !isNaN(Number(proj.id))
        const projName = proj.projectName || proj.projectId

        const projectBody: Record<string, unknown> = proj.hasCustomTime
          ? {
              projectName: projName,
              displayName: proj.displayName || projName,
              isEnabled: proj.isEnabled ?? true,
              startTime: proj.startTime || proj.dailyTimes || payload.dailyTimes || "01:00",
              timeZoneId: "SE Asia Standard Time",
              wattOver: 300,
              wattLess: 10,
              voltOver: 260,
              voltLess: 180,
            }
          : {
              projectName: projName,
              isEnabled: proj.isEnabled ?? true,
              retentionDays: 3,
              wattOver: 300,
              wattLess: 10,
              voltOver: 260,
              voltLess: 180,
            }

        if (!isExistingProject) {
          try {
            await fetchLesApi("/api/schedule/dashboard-pipelines/projects", {
              method: "POST",
              body: JSON.stringify(projectBody),
            })
          } catch {
            // Project might already be created
          }
        } else {
          try {
            await fetchLesApi(`/api/schedule/dashboard-pipelines/projects/${proj.id}`, {
              method: "PUT",
              body: JSON.stringify(projectBody),
            })
          } catch {
            // Ignore
          }
        }
      }
    }

    revalidatePath("/setting-system/menu-superadmin")
    return {
      success: response?.result ?? response?.success ?? true,
      message: response?.message,
    }
  } catch (error) {
    console.error("Error saving pipeline schedule:", error)
    return { success: false, message: "Failed to save schedule" }
  }
}

/**
 * Delete Master Pipeline Schedule via DELETE /api/schedule/dashboard-pipelines/{id}
 */
export async function deletePipelineSchedule(id: string): Promise<ApiResult> {
  try {
    const response = await fetchLesApi<{ result?: boolean; success?: boolean; message?: string }>(
      `/api/schedule/dashboard-pipelines/${id}`,
      { method: "DELETE" }
    )

    revalidatePath("/setting-system/menu-superadmin")
    return {
      success: response?.result ?? response?.success ?? true,
      message: response?.message,
    }
  } catch (error) {
    console.error("Error deleting pipeline schedule:", error)
    return { success: false, message: "Failed to delete schedule" }
  }
}

/**
 * Delete Project from Pipeline via DELETE /api/schedule/dashboard-pipelines/projects/{id}
 */
export async function deletePipelineProject(id: string): Promise<ApiResult> {
  try {
    const response = await fetchLesApi<{ result?: boolean; success?: boolean; message?: string }>(
      `/api/schedule/dashboard-pipelines/projects/${id}`,
      { method: "DELETE" }
    )

    revalidatePath("/setting-system/menu-superadmin")
    return {
      success: response?.result ?? response?.success ?? true,
      message: response?.message,
    }
  } catch (error) {
    console.error("Error deleting pipeline project:", error)
    return { success: false, message: "Failed to delete project" }
  }
}

/**
 * Item 1: Trigger Master Pipeline Schedule immediately via POST /api/schedule/dashboard-pipelines/{id}/trigger
 */
export async function triggerPipelineSchedule(id: string): Promise<ApiResult> {
  try {
    const response = await fetchLesApi<{ result?: boolean; success?: boolean; message?: string }>(
      `/api/schedule/dashboard-pipelines/${id}/trigger`,
      { method: "POST" }
    )

    revalidatePath("/setting-system/menu-superadmin")
    return {
      success: response?.result ?? response?.success ?? true,
      message: response?.message,
    }
  } catch (error) {
    console.error("Error triggering pipeline schedule:", error)
    return { success: false, message: "Failed to trigger schedule" }
  }
}

/**
 * Item 3: Trigger Repair for Single Project via POST /api/schedule/dashboard-pipelines/projects/{id}/trigger
 * 3.1 If single day: body { targetDate: "YYYY-MM-DD" }
 * 3.2 If multiple days: body { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD" }
 */
export async function repairPipelineProject(
  projectId: string,
  payload: { startDate: string; endDate: string; targetDate?: string }
): Promise<ApiResult> {
  try {
    const isSingleDay =
      Boolean(payload.targetDate) || !payload.endDate || payload.startDate === payload.endDate

    const requestBody = isSingleDay
      ? { targetDate: payload.targetDate || payload.startDate }
      : { startDate: payload.startDate, endDate: payload.endDate }

    const response = await fetchLesApi<{ result?: boolean; success?: boolean; message?: string }>(
      `/api/schedule/dashboard-pipelines/projects/${projectId}/trigger`,
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      }
    )

    return {
      success: response?.result ?? response?.success ?? true,
      message: response?.message,
    }
  } catch (error) {
    console.error("Error triggering project repair:", error)
    return { success: false, message: "Failed to trigger repair" }
  }
}

// Backward-compatible alias
export const repairPipelineSchedule = repairPipelineProject

/**
 * Item 2: Trigger Restore for Single Project via POST /api/schedule/dashboard-pipelines/projects/{id}/restore
 * Includes checkbox reprocessDashboard (default false)
 */
export async function restorePipelineProject(
  projectId: string,
  payload: { startDate: string; endDate: string; reprocessDashboard?: boolean }
): Promise<ApiResult> {
  try {
    const response = await fetchLesApi<{ result?: boolean; success?: boolean; message?: string }>(
      `/api/schedule/dashboard-pipelines/projects/${projectId}/restore`,
      {
        method: "POST",
        body: JSON.stringify({
          startDate: payload.startDate,
          endDate: payload.endDate,
          reprocessDashboard: Boolean(payload.reprocessDashboard),
        }),
      }
    )

    return {
      success: response?.result ?? response?.success ?? true,
      message: response?.message,
    }
  } catch (error) {
    console.error("Error triggering project restore:", error)
    return { success: false, message: "Failed to trigger restore" }
  }
}

// Backward-compatible alias
export const restorePipelineSchedule = restorePipelineProject

/**
 * Item 4: Fetch Pipeline Execution Logs via GET /api/schedule/dashboard-pipelines/logs
 */
export async function getPipelineLogs(
  projectName?: string,
  limit: number = 50
): Promise<PipelineLogItem[]> {
  try {
    const queryParams = new URLSearchParams()
    if (projectName && projectName !== "ALL") {
      queryParams.set("projectName", projectName)
    }
    queryParams.set("limit", String(limit))

    const response = await fetchLesApi<
      PipelineLogItem[] | { data?: PipelineLogItem[]; result?: boolean }
    >(`/api/schedule/dashboard-pipelines/logs?${queryParams.toString()}`, {
      method: "GET",
    })

    let rawList: PipelineLogItem[] = []
    if (Array.isArray(response)) {
      rawList = response
    } else if (response && Array.isArray((response as { data?: PipelineLogItem[] }).data)) {
      rawList = (response as { data?: PipelineLogItem[] }).data || []
    }

    return rawList.map((log, idx): PipelineLogItem => {
      const raw = log as unknown as Record<string, unknown>
      const executedAt = raw.executedAt
        ? String(raw.executedAt)
        : raw.startedAt
          ? String(raw.startedAt)
          : raw.createdAt
            ? String(raw.createdAt)
            : undefined
      const durationMs =
        typeof raw.durationMs === "number"
          ? raw.durationMs
          : typeof raw.duration_ms === "number"
            ? raw.duration_ms
            : typeof raw.executionTimeMs === "number"
              ? raw.executionTimeMs
              : 0
      const step1Status = raw.step1Status
        ? String(raw.step1Status)
        : raw.step1_status
          ? String(raw.step1_status)
          : undefined
      const step2Status = raw.step2Status
        ? String(raw.step2Status)
        : raw.step2_status
          ? String(raw.step2_status)
          : undefined
      const step3Status = raw.step3Status
        ? String(raw.step3Status)
        : raw.step3_status
          ? String(raw.step3_status)
          : undefined

      return {
        id: (raw.id as number | string) ?? idx + 1,
        projectId: (raw.projectId || raw.project_id) as number | string | undefined,
        projectName: String(raw.projectName || raw.project_name || ""),
        targetDate: raw.targetDate
          ? String(raw.targetDate)
          : raw.target_date
            ? String(raw.target_date)
            : undefined,
        status: String(raw.status || "UNKNOWN").toUpperCase(),
        step1Status,
        step1ItemCount:
          typeof raw.step1ItemCount === "number"
            ? raw.step1ItemCount
            : Number(raw.step1_item_count || 0),
        step2Status,
        step2ItemCount:
          typeof raw.step2ItemCount === "number"
            ? raw.step2ItemCount
            : Number(raw.step2_item_count || 0),
        step3Status,
        step3GroupCount:
          typeof raw.step3GroupCount === "number"
            ? raw.step3GroupCount
            : Number(raw.step3_group_count || 0),
        durationMs,
        errorMessage: raw.errorMessage
          ? String(raw.errorMessage)
          : raw.error
            ? String(raw.error)
            : undefined,
        executedAt,
        stepName: String(raw.stepName || raw.step_name || raw.step || ""),
        step: String(raw.step || raw.stepName || raw.step_name || ""),
        recordsProcessed:
          typeof raw.recordsProcessed === "number"
            ? raw.recordsProcessed
            : Number(raw.records_processed || 0),
        executionTimeMs: durationMs,
        message: raw.message
          ? String(raw.message)
          : raw.lastRunMessage
            ? String(raw.lastRunMessage)
            : undefined,
        startedAt: executedAt,
        createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
        completedAt: raw.completedAt ? String(raw.completedAt) : undefined,
      }
    })
  } catch (error) {
    console.error("Error fetching pipeline logs:", error)
    return []
  }
}
