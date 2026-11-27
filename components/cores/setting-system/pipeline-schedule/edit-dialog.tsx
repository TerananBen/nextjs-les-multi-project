"use client"

import * as React from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Trash2, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import type {
    DashboardPipelineItem,
    PipelineProjectItem,
    SavePipelineScheduleParams,
} from "@/types/pipeline-schedule"
import type { ProjectConfig } from "@/config/projects/types"
import { getPipelineProjects } from "@/app/actions/pipeline-schedule"

interface EditScheduleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    item: DashboardPipelineItem | null
    projects: ProjectConfig[]
    pipelineProjects?: PipelineProjectItem[]
    onSave: (payload: SavePipelineScheduleParams) => Promise<boolean>
    onDeleteProject?: (projectId: string) => Promise<boolean>
}

export function EditScheduleDialog({
    open,
    onOpenChange,
    item,
    projects,
    pipelineProjects,
    onSave,
    onDeleteProject,
}: EditScheduleDialogProps) {
    const t = useTranslations("PipelineSchedule.dialog")
    const [isSaving, setIsSaving] = React.useState(false)
    const [selectedProjectToAdd, setSelectedProjectToAdd] = React.useState<string>("")

    const formSchema = React.useMemo(() => {
        return z.object({
            name: z.string().min(1, t("errors.nameRequired")),
            jobType: z.string().default("DashboardPipeline"),
            description: z.string().max(500).optional(),
            scheduleType: z.string().default("Daily"),
            dailyTimes: z.string().optional().default("01:00"),
            staggerDelaySeconds: z.coerce.number().min(0).default(0),
            timeZoneId: z.string().default("SE Asia Standard Time"),
            isEnabled: z.boolean().default(true),
            projects: z
                .array(
                    z.object({
                        id: z.string().optional(),
                        backendId: z.string().optional(),
                        projectId: z.string(),
                        projectName: z.string().optional(),
                        displayName: z.string().default(""),
                        dailyTimes: z.string().default("01:00"),
                        startTime: z.string().optional(),
                        hasCustomTime: z.boolean().default(false),
                        isEnabled: z.boolean().default(false),
                    })
                )
                .min(1, t("errors.projectRequired")),
        })
    }, [t])

    type FormValues = z.infer<typeof formSchema>

    const form = useForm<FormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: "",
            jobType: "DashboardPipeline",
            description: "",
            scheduleType: "Daily",
            dailyTimes: "01:00",
            staggerDelaySeconds: 0,
            timeZoneId: "SE Asia Standard Time",
            isEnabled: true,
            projects: [],
        },
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "projects",
    })

    const mapProjectItem = React.useCallback(
        (p: {
            id?: string
            backendId?: string
            projectId?: string
            projectName?: string
            displayName?: string
            startTime?: string
            dailyTimes?: string | string[]
            hasCustomTime?: boolean
            isEnabled?: boolean
        }) => {
            const rawProjId = p.projectName || p.projectId || ""
            const matchedProj = projects.find(
                (pr) =>
                    pr.id === rawProjId ||
                    pr.code === rawProjId ||
                    pr.uuid === rawProjId ||
                    pr.name === p.projectName ||
                    pr.name === rawProjId
            )
            const timeVal =
                typeof p.dailyTimes === "string"
                    ? p.dailyTimes
                    : Array.isArray(p.dailyTimes)
                        ? p.dailyTimes[0]
                        : p.startTime || "01:00"

            const realId = p.id ? String(p.id) : undefined
            const rawStartTime = p.startTime
            const hasCustom =
                typeof p.hasCustomTime === "boolean"
                    ? p.hasCustomTime
                    : Boolean(rawStartTime && typeof rawStartTime === "string" && rawStartTime.trim() !== "")

            return {
                id: realId,
                backendId: realId,
                projectId: rawProjId,
                projectName: matchedProj?.name || p.projectName || p.displayName || rawProjId,
                displayName: p.displayName || p.projectName || matchedProj?.name || rawProjId,
                dailyTimes: timeVal || "01:00",
                startTime: (rawStartTime || timeVal || "01:00").slice(0, 5),
                hasCustomTime: hasCustom,
                isEnabled: p.isEnabled ?? true,
            }
        },
        [projects]
    )

    const getDefaultNotificationProjects = React.useCallback(
        (
            existingList: Array<{
                id?: string
                backendId?: string
                projectId: string
                projectName?: string
                displayName?: string
                dailyTimes?: string
                startTime?: string
                hasCustomTime?: boolean
                isEnabled?: boolean
            }> = [],
            forceFalse: boolean = false
        ) => {
            const globalTime = form.getValues("dailyTimes") || "01:00"
            return projects.map((p) => {
                const existing = existingList.find(
                    (cp) =>
                        cp.projectId === p.name ||
                        cp.projectId === p.id ||
                        cp.projectName === p.name
                )
                return {
                    id: existing?.id,
                    backendId: existing?.backendId,
                    projectId: p.name || p.id,
                    projectName: p.name,
                    displayName: existing?.displayName || p.name,
                    dailyTimes: existing?.dailyTimes || globalTime,
                    startTime: existing?.startTime || globalTime,
                    hasCustomTime: false,
                    isEnabled: forceFalse ? false : (existing?.isEnabled ?? false),
                }
            })
        },
        [projects, form]
    )

    const handleJobTypeChange = React.useCallback(
        (newType: string) => {
            form.setValue("jobType", newType, { shouldValidate: true, shouldDirty: true })
            if (newType === "DashboardNotification") {
                const defaulted = getDefaultNotificationProjects([], true)
                form.setValue("projects", defaulted, { shouldValidate: true, shouldDirty: true })
            } else if (newType === "DashboardPipeline") {
                form.setValue("projects", [], { shouldValidate: true, shouldDirty: true })
            }
        },
        [form, getDefaultNotificationProjects]
    )

    // Item 2: Pre-fetch projects using GET /api/schedule/dashboard-pipelines/projects ONLY in Edit mode
    React.useEffect(() => {
        if (!open) return

        let isMounted = true

        if (item) {
            const isNotification = item.jobType === "DashboardNotification"
            // EDIT MODE ONLY: Populate item data and fetch live pipeline projects
            const initialProjSource =
                item.projects && item.projects.length > 0
                    ? item.projects
                    : pipelineProjects && pipelineProjects.length > 0
                        ? pipelineProjects
                        : []

            let initialProjects = initialProjSource.map(mapProjectItem)
            if (isNotification && projects.length > 0) {
                initialProjects = getDefaultNotificationProjects(initialProjects)
            }

            form.reset({
                name: item.name || "",
                jobType: item.jobType || "DashboardPipeline",
                description: item.description || "",
                scheduleType: item.scheduleType || "Daily",
                dailyTimes:
                    typeof item.dailyTimes === "string"
                        ? item.dailyTimes
                        : Array.isArray(item.dailyTimes)
                            ? item.dailyTimes[0]
                            : "01:00",
                staggerDelaySeconds: item.staggerDelaySeconds || 0,
                timeZoneId: item.timeZoneId || "SE Asia Standard Time",
                isEnabled: item.isEnabled ?? true,
                projects: initialProjects,
            })

            // Asynchronously fetch live projects from GET /api/schedule/dashboard-pipelines/projects
            const fetchProjectsLive = async () => {
                try {
                    const apiProjects = await getPipelineProjects()
                    if (isMounted && apiProjects && apiProjects.length > 0) {
                        let mapped = apiProjects.map(mapProjectItem)
                        if (form.getValues("jobType") === "DashboardNotification" && projects.length > 0) {
                            mapped = getDefaultNotificationProjects(mapped)
                        }
                        form.setValue("projects", mapped, { shouldValidate: true })
                    }
                } catch (err) {
                    console.error("Failed to load pipeline projects in dialog:", err)
                }
            }

            fetchProjectsLive()
        } else {
            // ADD MODE: Start completely empty! DO NOT pre-fetch or pre-fill projects!
            form.reset({
                name: "",
                jobType: "DashboardPipeline",
                description: "",
                scheduleType: "Daily",
                dailyTimes: "01:00",
                staggerDelaySeconds: 0,
                timeZoneId: "SE Asia Standard Time",
                isEnabled: true,
                projects: [],
            })
        }

        setSelectedProjectToAdd("")

        return () => {
            isMounted = false
        }
    }, [open, item, projects, pipelineProjects, form, mapProjectItem, getDefaultNotificationProjects])

    // Select project and display its name
    const handleAddProject = React.useCallback(
        (projNameOrId: string) => {
            if (!projNameOrId) return
            const proj = projects.find(
                (p) =>
                    p.name === projNameOrId ||
                    p.id === projNameOrId ||
                    p.code === projNameOrId ||
                    p.uuid === projNameOrId
            )
            if (!proj) return

            const currentProjects = form.getValues("projects") || []
            const alreadyExists = currentProjects.some(
                (p) => p.projectId === proj.name || p.projectId === proj.id
            )
            if (alreadyExists) {
                setSelectedProjectToAdd("")
                return
            }

            const globalTime = form.getValues("dailyTimes") || "01:00"
            append({
                projectId: proj.name || proj.id,
                projectName: proj.name,
                displayName: proj.name,
                dailyTimes: globalTime || "01:00",
                startTime: globalTime || "01:00",
                hasCustomTime: false,
                isEnabled: true,
            })
            setSelectedProjectToAdd("")
        },
        [projects, form, append]
    )

    // Trigger API only when in Edit mode (item !== null) AND the project has an existing saved backend ID
    const handleDeleteProjectRow = async (index: number) => {
        // Never call delete API in Add mode (!item)
        if (item && onDeleteProject) {
            const formProjects = form.getValues("projects") || []
            const targetProj = formProjects[index]
            const realBackendId = targetProj?.backendId || targetProj?.id

            // Only trigger API if it was an existing project fetched from backend
            if (realBackendId && realBackendId.trim() !== "") {
                try {
                    await onDeleteProject(realBackendId)
                } catch {
                    // Ignore API error
                }
            }
        }
        remove(index)
    }

    const onSubmit = async (values: FormValues) => {
        setIsSaving(true)
        try {
            const projectCount = values.projects ? values.projects.length : 0
            const payload: SavePipelineScheduleParams = {
                id: item?.id,
                name: values.name.trim(),
                jobType: values.jobType || "DashboardPipeline",
                description: values.description?.trim() || "",
                scheduleType: values.scheduleType,
                dailyTimes: values.dailyTimes || "01:00",
                staggerDelaySeconds: values.staggerDelaySeconds,
                timeZoneId: "SE Asia Standard Time",
                maxConcurrentProjects: projectCount,
                isEnabled: values.isEnabled ?? true,
                projects: values.projects.map((p) => ({
                    id: p.id,
                    projectId: p.projectId,
                    projectName: p.projectName,
                    displayName: p.displayName.trim() || p.projectName || p.projectId,
                    dailyTimes: p.dailyTimes || "01:00",
                    startTime: p.startTime || p.dailyTimes || "01:00",
                    hasCustomTime: Boolean(p.hasCustomTime),
                    isEnabled: p.isEnabled ?? true,
                    retentionDays: 3,
                    wattOver: 300,
                    wattLess: 10,
                    voltOver: 260,
                    voltLess: 180,
                    timeZoneId: "SE Asia Standard Time",
                })),
            }

            const success = await onSave(payload)
            if (success) {
                onOpenChange(false)
            }
        } catch {
            toast.error(t("errors.nameRequired"))
        } finally {
            setIsSaving(false)
        }
    }

    const watchedJobType = form.watch("jobType")
    const isNotificationMode = watchedJobType === "DashboardNotification"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-xl">
                <DialogHeader className="px-6 py-4 border-b border-border/40 shrink-0 text-left">
                    <DialogTitle className="text-lg font-semibold flex items-center justify-start gap-2">
                        {item ? t("editTitle") : t("addTitle")}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        id="pipeline-schedule-form"
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="flex flex-col flex-1 min-h-0 overflow-hidden"
                    >
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 max-h-[calc(90vh-130px)]">
                            {/* 5.1 Header Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Schedule Name */}
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>
                                                {t("nameLabel")} <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input placeholder={t("namePlaceholder")} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Job Type */}
                                <FormField
                                    control={form.control}
                                    name="jobType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("jobTypeLabel")}</FormLabel>
                                            <Select onValueChange={handleJobTypeChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full cursor-pointer">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="DashboardPipeline" className="cursor-pointer">
                                                        {t("jobTypeDashboardPipeline")}
                                                    </SelectItem>
                                                    <SelectItem value="DashboardNotification" className="cursor-pointer">
                                                        {t("jobTypeDashboardNotification")}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Schedule Type */}
                                <FormField
                                    control={form.control}
                                    name="scheduleType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("typeLabel")}</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full cursor-pointer">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Daily" className="cursor-pointer">
                                                        {t("typeDaily")}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Daily Times */}
                                <FormField
                                    control={form.control}
                                    name="dailyTimes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("dailyTimesLabel")}</FormLabel>
                                            <FormControl>
                                                <Input type="time" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Delay (seconds) */}
                                <FormField
                                    control={form.control}
                                    name="staggerDelaySeconds"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("delayLabel")}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step={1}
                                                    placeholder={t("delayPlaceholder")}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Description */}
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>{t("descriptionLabel")}</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder={t("descriptionPlaceholder")}
                                                    rows={3}
                                                    className="resize-none"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* 5.2 Projects Section */}
                            <div className="space-y-3 pt-3 border-t border-border/80">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        {t("projectsHeader")}
                                    </h3>
                                    {!isNotificationMode && (
                                        <div className="w-full sm:w-[280px]">
                                            <Combobox
                                                value={selectedProjectToAdd}
                                                onValueChange={(val) => {
                                                    if (val) handleAddProject(val)
                                                }}
                                            >
                                                <ComboboxInput
                                                    className="h-9 w-full rounded-md border-input bg-background text-xs sm:text-sm"
                                                    placeholder={t("selectProject")}
                                                />
                                                <ComboboxContent searchPlaceholder={t("searchProjectPlaceholder")}>
                                                    <ComboboxEmpty>{t("noProjectFound")}</ComboboxEmpty>
                                                    <ComboboxList>
                                                        {projects.map((p) => (
                                                            <ComboboxItem key={p.id} value={p.name} showCheck={false}>
                                                                {p.name}
                                                            </ComboboxItem>
                                                        ))}
                                                    </ComboboxList>
                                                </ComboboxContent>
                                            </Combobox>
                                        </div>
                                    )}
                                </div>

                                {/* Table of Selected Projects */}
                                <div className="bg-background border rounded-lg shadow-2xs overflow-hidden">
                                    {isNotificationMode ? (
                                        <div className="grid grid-cols-[1fr_120px] bg-muted/70 p-2.5 font-medium text-xs text-muted-foreground border-b border-border">
                                            <div className="pl-1">{t("projectsHeader")}</div>
                                            <div className="text-center">{t("notificationStatus")}</div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-[1fr_1.2fr_210px_48px] bg-muted/70 p-2.5 font-medium text-xs text-muted-foreground border-b border-border">
                                            <div className="pl-1">{t("projectsHeader")}</div>
                                            <div>{t("displayName")}</div>
                                            <div className="pl-1">{t("projectDailyTimes")}</div>
                                            <div className="text-center">{t("delete")}</div>
                                        </div>
                                    )}

                                    {fields.length === 0 ? (
                                        <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 flex flex-col items-center gap-1.5">
                                            <span>{t("errors.projectRequired")}</span>
                                            {form.formState.errors.projects && (
                                                <span className="text-xs text-destructive font-medium">
                                                    {form.formState.errors.projects.message}
                                                </span>
                                            )}
                                        </div>
                                    ) : isNotificationMode ? (
                                        <div className="max-h-[260px] overflow-y-auto divide-y divide-border">
                                            {fields.map((field, index) => {
                                                const isEnabled = form.watch(`projects.${index}.isEnabled`) ?? false
                                                return (
                                                    <div
                                                        key={field.id}
                                                        className="grid grid-cols-[1fr_120px] p-2.5 items-center gap-2 hover:bg-muted/40 transition-colors text-xs"
                                                    >
                                                        {/* Project Name (Plain text) */}
                                                        <div className="pl-1 flex items-center min-w-0">
                                                            <span className="text-xs font-medium text-foreground truncate">
                                                                {field.projectName || field.projectId}
                                                            </span>
                                                        </div>

                                                        {/* Notification Status Switch */}
                                                        <div className="flex justify-center items-center">
                                                            <Switch
                                                                checked={isEnabled}
                                                                onCheckedChange={(checked) => {
                                                                    form.setValue(`projects.${index}.isEnabled`, checked, {
                                                                        shouldDirty: true,
                                                                        shouldValidate: true,
                                                                    })
                                                                }}
                                                                aria-label={field.projectName || field.projectId}
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="max-h-[260px] overflow-y-auto divide-y divide-border">
                                            {fields.map((field, index) => {
                                                const hasCustomTime = form.watch(`projects.${index}.hasCustomTime`)
                                                return (
                                                    <div
                                                        key={field.id}
                                                        className="grid grid-cols-[1fr_1.2fr_210px_48px] p-2.5 items-center gap-2 hover:bg-muted/40 transition-colors text-xs"
                                                    >
                                                        {/* Project Name (Plain text) */}
                                                        <div className="pl-1 flex items-center min-w-0">
                                                            <span className="text-xs font-medium text-foreground truncate">
                                                                {field.projectName || field.projectId}
                                                            </span>
                                                        </div>

                                                        {/* Display Name Input */}
                                                        <div>
                                                            <Input
                                                                {...form.register(`projects.${index}.displayName` as const)}
                                                                className="h-8 text-xs bg-background"
                                                                placeholder={field.projectName || "Display name"}
                                                            />
                                                        </div>

                                                        {/* Project Daily Times Input with Checkbox */}
                                                        <div className="flex items-center justify-between gap-2 pl-1">
                                                            <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none shrink-0">
                                                                <Checkbox
                                                                    checked={Boolean(hasCustomTime)}
                                                                    onCheckedChange={(checked) => {
                                                                        form.setValue(
                                                                            `projects.${index}.hasCustomTime`,
                                                                            Boolean(checked),
                                                                            {
                                                                                shouldDirty: true,
                                                                                shouldValidate: true,
                                                                            }
                                                                        )
                                                                    }}
                                                                />
                                                                <span className="text-muted-foreground whitespace-nowrap">
                                                                    {t("customTime")}
                                                                </span>
                                                            </label>
                                                            {hasCustomTime && (
                                                                <Input
                                                                    type="time"
                                                                    {...form.register(`projects.${index}.startTime` as const)}
                                                                    className="h-8 w-24 text-xs bg-background font-mono text-center shrink-0"
                                                                />
                                                            )}
                                                        </div>

                                                        {/* Delete Button */}
                                                        <div className="flex justify-center">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDeleteProjectRow(index)}
                                                                className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer matching setting-system/personal */}
                        <div className="border-t border-border/40 bg-muted/20 px-6 py-3 flex items-center justify-end gap-2 shrink-0 rounded-b-lg">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenChange(false)}
                                className="cursor-pointer h-9 px-4 text-xs shadow-2xs"
                                disabled={isSaving}
                            >
                                {t("cancel")}
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isSaving}
                                className="cursor-pointer h-9 px-4 text-xs font-medium shadow-2xs"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                        {t("saving")}
                                    </>
                                ) : (
                                    t("save")
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
