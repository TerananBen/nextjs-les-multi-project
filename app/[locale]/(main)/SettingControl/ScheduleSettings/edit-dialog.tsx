"use client"

import * as React from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { ScheduleItem, Scene } from "@/types/schedule-settings"
import { DeviceGroup } from "@/types/street-light"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Trash2, Plus, X, Clock } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { saveScheduleSettingsAction } from "@/app/actions/schedule-settings"
import { Loader2 } from "lucide-react"

const sceneSchema = z.object({
    time: z.string().optional().nullable(),
    dim: z.string().optional().nullable(),
    open_volt: z.string().optional().nullable(),
    open_time: z.string().optional().nullable(),
    close_volt: z.string().optional().nullable(),
    close_time: z.string().optional().nullable(),
})

// Removed static scheduleSchema from here

interface ScheduleFormValues {
    scheduleName: string
    typeSchedule: string
    dataGroupName: string[]
    listScenes: Scene[]
    groupCode?: string
}

interface EditScheduleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    schedule: ScheduleItem | null
    groups: DeviceGroup[] // Available groups to select
}

export function EditScheduleDialog({
    open,
    onOpenChange,
    schedule,
    groups,
}: EditScheduleDialogProps) {
    const t = useTranslations("ScheduleSettings.dialog")
    const tTypes = useTranslations("ScheduleSettings.types")
    const tValidation = useTranslations("ScheduleSettings.validation")
    const [isSaving, setIsSaving] = React.useState(false)

    const scheduleSchema = React.useMemo(() => z.object({
        scheduleName: z.string().min(1, tValidation("required")),
        typeSchedule: z.string(),
        dataGroupName: z.array(z.string()),
        listScenes: z.array(sceneSchema),
        groupCode: z.string().optional(),
    }).superRefine((data, ctx) => {
        // 1. Validation for ALL types: Must have at least one group
        if (data.dataGroupName.length === 0) {
            ctx.addIssue({
                code: "custom",
                message: tValidation("groupRequired"),
                path: ["dataGroupName"]
            });
        }

        // Validation for "Time" Work Type
        if (data.typeSchedule === "time") {

            // 2. Must have at least one scene
            if (data.listScenes.length === 0) {
                ctx.addIssue({
                    code: "custom", // Generic error for the list
                    message: tValidation("timeSlotRequired"),
                    path: ["listScenes"]
                });
            }

            // 3. Max 12 time slots
            if (data.listScenes.length > 12) {
                ctx.addIssue({
                    code: "custom",
                    message: tValidation("maxTimeSlots"),
                    path: ["listScenes"]
                });
            }

            // 4. Time and Dim must not be empty, and Times must be unique
            const times = new Set<string>();
            data.listScenes.forEach((scene, index) => {
                // Check non-empty
                if (!scene.time) {
                    ctx.addIssue({
                        code: "custom",
                        message: tValidation("timeRequired"),
                        path: ["listScenes", index, "time"]
                    });
                }
                if (!scene.dim) {
                    ctx.addIssue({
                        code: "custom",
                        message: tValidation("dimRequired"),
                        path: ["listScenes", index, "dim"]
                    });
                }

                // Check uniqueness
                if (scene.time) {
                    if (times.has(scene.time)) {
                        ctx.addIssue({
                            code: "custom",
                            message: tValidation("duplicateTime"),
                            path: ["listScenes", index, "time"] // Mark the duplicate
                        });
                    } else {
                        times.add(scene.time);
                    }
                }
            });
        }

        // Validation for "Light" Work Type
        if (data.typeSchedule === "light") {
            const light = data.listScenes[0] || {};

            // Open Volt (Lux)
            if (!light.open_volt) {
                ctx.addIssue({ code: "custom", message: tValidation("required"), path: ["listScenes", 0, "open_volt"] });
            } else if (!/^\d+$/.test(light.open_volt)) {
                ctx.addIssue({ code: "custom", message: tValidation("numericOnly"), path: ["listScenes", 0, "open_volt"] });
            } else if (Number(light.open_volt) < 1 || Number(light.open_volt) > 4000) {
                ctx.addIssue({ code: "custom", message: tValidation("luxRange"), path: ["listScenes", 0, "open_volt"] });
            }

            // Open Time (Dim)
            if (!light.open_time) {
                ctx.addIssue({ code: "custom", message: tValidation("required"), path: ["listScenes", 0, "open_time"] });
            } else if (!/^\d+$/.test(light.open_time)) {
                ctx.addIssue({ code: "custom", message: tValidation("numericOnly"), path: ["listScenes", 0, "open_time"] });
            } else if (Number(light.open_time) < 1 || Number(light.open_time) > 100) {
                ctx.addIssue({ code: "custom", message: tValidation("dimRange"), path: ["listScenes", 0, "open_time"] });
            }

            // Close Volt (Lux)
            if (!light.close_volt) {
                ctx.addIssue({ code: "custom", message: tValidation("required"), path: ["listScenes", 0, "close_volt"] });
            } else if (!/^\d+$/.test(light.close_volt)) {
                ctx.addIssue({ code: "custom", message: tValidation("numericOnly"), path: ["listScenes", 0, "close_volt"] });
            } else if (Number(light.close_volt) < 1 || Number(light.close_volt) > 4000) {
                ctx.addIssue({ code: "custom", message: tValidation("luxRange"), path: ["listScenes", 0, "close_volt"] });
            }

            // Close Time (Dim)
            if (!light.close_time) {
                ctx.addIssue({ code: "custom", message: tValidation("required"), path: ["listScenes", 0, "close_time"] });
            } else if (!/^\d+$/.test(light.close_time)) {
                ctx.addIssue({ code: "custom", message: tValidation("numericOnly"), path: ["listScenes", 0, "close_time"] });
            } else if (Number(light.close_time) < 1 || Number(light.close_time) > 100) {
                ctx.addIssue({ code: "custom", message: tValidation("dimRange"), path: ["listScenes", 0, "close_time"] });
            }
        }
    }), [tValidation]);

    const form = useForm<ScheduleFormValues>({
        resolver: zodResolver(scheduleSchema),
        defaultValues: {
            scheduleName: "",
            typeSchedule: "time",
            dataGroupName: [],
            listScenes: [],
        },
    })

    const { control, handleSubmit, reset, watch, setValue } = form
    const typeSchedule = watch("typeSchedule")

    // Field Array for Groups (using string array of names here for simplicity as per UI)
    // In real app, might want to track IDs. API has dataGroupName and dataGroupCode arrays paralleled.
    // For this UI demo, we'll just manage the names list.
    const { fields: groupFields, append: appendGroup, remove: removeGroup } = useFieldArray({
        control,
        name: "dataGroupName" as any, // casting because simple array field array quirks
    })

    // Field Array for Scenes (time based)
    const { fields: sceneFields, append: appendScene, remove: removeScene, replace: replaceScenes } = useFieldArray({
        control: form.control,
        name: "listScenes",
    })

    // Manage scenes based on type
    React.useEffect(() => {
        const currentScenes = form.getValues("listScenes")
        if (typeSchedule === "light") {
            // Ensure at least one scene exists for Light mode inputs
            if (currentScenes.length === 0) {
                appendScene({
                    time: null,
                    dim: null,
                    open_volt: "350",
                    open_time: "100",
                    close_volt: "1250",
                    close_time: "0"
                })
            }
        } else if (typeSchedule === "manual") {
            // Manual mode doesn't need scenes, but keeping them doesn't hurt logic.
            // However, clearing them is cleaner.
            if (currentScenes.length > 0) {
                replaceScenes([])
            }
        }
    }, [typeSchedule, appendScene, replaceScenes, form])


    React.useEffect(() => {
        if (open) {
            if (schedule) {
                form.reset({
                    scheduleName: schedule.scheduleName,
                    typeSchedule: schedule.typeSchedule,
                    dataGroupName: schedule.dataGroupName || [],
                    listScenes: schedule.listScenes || [],
                    groupCode: schedule.groupCode,
                })
            } else {
                form.reset({
                    scheduleName: "",
                    typeSchedule: "time", // Default
                    dataGroupName: [],
                    listScenes: [],
                })
            }
        }
    }, [open, schedule, form])

    const onSubmit = async (data: ScheduleFormValues) => {
        setIsSaving(true)
        try {
            // Construct list_group_name_code: " GroupName$GroupCode"
            // We have names, need to find codes from groups prop.
            const list_group_name_code_array = data.dataGroupName.map(name => {
                // Find group by strict name or trimmed name
                const group = groups.find(g => g.groupName === name || g.groupName === name.trim())
                // Use the FOUND group's name and code to ensure consistency (e.g. "MTP$Code")
                // If we want to preserve the space from the form, we could use `name`, but using `group.groupName` is cleaner.
                // However, user example showed " MTP$Code". 
                // Let's use `group.groupName` for safety, unless the user specifically needs the space. 
                // Given the space was likely an artifact of the legacy data, clean is likely better.
                return group ? `${group.groupName}$${group.groupCode}` : null
            }).filter(Boolean) as string[]

            // Determine scenes based on type
            let finalScenes: any = []
            if (data.typeSchedule === "time") {
                finalScenes = data.listScenes.map(s => ({
                    time: s.time,
                    dim: s.dim
                }))
            } else if (data.typeSchedule === "light") {
                const s = data.listScenes[0] || { open_volt: "350", open_time: "100", close_volt: "1250", close_time: "0" }
                finalScenes = {
                    open_volt: s.open_volt,
                    open_time: s.open_time,
                    close_volt: s.close_volt,
                    close_time: s.close_time
                }
            }

            // Construct Payload
            const payload: any = {
                name_schedule: data.scheduleName,
                code_name: schedule ? schedule.groupCode : "new", // "new" for Add, groupCode for Edit
                // API expects JSON STRING of the array, e.g. "[\" Group$Code\"]"
                list_group_name_code: JSON.stringify(list_group_name_code_array),
                // API expects JSON STRING of the object list
                list_scenes_light: JSON.stringify(finalScenes),
                type_schedule: data.typeSchedule,
                type_set: "group", // Default "group"
                // API expects JSON STRING of the array
                list_days: JSON.stringify(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]),
                version_light_sensor: process.env.NEXT_PUBLIC_VERSION_LIGHT_SENSOR || "2"
            }

            const result = await saveScheduleSettingsAction(payload)

            if (result.success) {
                toast.success(t("saveSuccess"))
                onOpenChange(false)
                // Ideally refresh data
                window.location.reload() // Simple refresh for now or use router.refresh()
            } else {
                toast.error(t("saveError") + (result.message ? `: ${result.message}` : ""))
            }
        } catch (error) {
            console.error(error)
            toast.error(t("saveError"))
        } finally {
            setIsSaving(false)
        }
    }

    // Handlers for adding group
    const [selectedGroupToAdd, setSelectedGroupToAdd] = React.useState<string>("")

    const handleAddGroup = () => {
        if (selectedGroupToAdd && !form.getValues("dataGroupName").includes(selectedGroupToAdd)) {
            const current = form.getValues("dataGroupName")
            form.setValue("dataGroupName", [...current, selectedGroupToAdd])
            setSelectedGroupToAdd("")
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
                <DialogHeader className="p-6 pb-2 border-b sticky top-0 z-10 bg-background">
                    <div className="flex justify-between items-center mr-8">
                        <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            {schedule ? t("title") : t("addTitle")}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-8 min-h-[60vh] bg-background">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Schedule Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-foreground">
                                    {t("scheduleNameLabel")} <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    {...form.register("scheduleName")}
                                    className={`h-10 border-input focus:border-primary transition-colors bg-muted/50 focus:bg-background ${form.formState.errors.scheduleName ? "border-destructive" : ""}`}
                                    placeholder="Enter schedule name..."
                                />
                                {form.formState.errors.scheduleName && (
                                    <span className="text-xs text-red-500 font-medium">
                                        {form.formState.errors.scheduleName.message}
                                    </span>
                                )}
                            </div>

                            {/* Type Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-foreground">
                                    {t("typeLabel")}
                                </label>
                                <Select
                                    value={typeSchedule}
                                    onValueChange={(val) => setValue("typeSchedule", val)}
                                >
                                    <SelectTrigger className="h-10 border-input bg-muted/50 focus:bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="time">{tTypes("time")}</SelectItem>
                                        <SelectItem value="light">{tTypes("light")}</SelectItem>
                                        <SelectItem value="manual">{tTypes("manual")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Groups Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-foreground border-l-4 border-primary pl-2">
                                    {t("groupNameHeader")}
                                </h3>
                                <div className="flex gap-2 w-full max-w-sm">
                                    <Select value={selectedGroupToAdd} onValueChange={setSelectedGroupToAdd}>
                                        <SelectTrigger className="h-9 border-input bg-muted/50 focus:bg-background">
                                            <SelectValue placeholder={t("selectGroup")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {groups.map((g) => (
                                                <SelectItem key={g.groupCode} value={g.groupName}>
                                                    {g.groupName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm shrink-0"
                                        onClick={handleAddGroup}
                                    >
                                        <Plus className="w-4 h-4 mr-1" />
                                        {t("addGroup")}
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-background border rounded-xl shadow-sm overflow-hidden">
                                {watch("dataGroupName").length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground bg-muted/50 flex flex-col items-center gap-2">
                                        <span>No groups selected</span>
                                        {form.formState.errors.dataGroupName && (
                                            <span className="text-sm text-red-500 font-medium">
                                                {form.formState.errors.dataGroupName.message}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        <div className="grid grid-cols-[1fr_80px] bg-muted/80 p-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                                            <div>{t("groupNameHeader")}</div>
                                            <div className="text-center">{t("deleteHeader")}</div>
                                        </div>
                                        <div className="max-h-[200px] overflow-y-auto">
                                            {watch("dataGroupName").map((groupName, index) => (
                                                <div key={index} className="grid grid-cols-[1fr_80px] p-3 items-center hover:bg-muted/50 transition-colors">
                                                    <div className="text-sm text-foreground font-medium pl-1">{groupName}</div>
                                                    <div className="flex justify-center">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                            onClick={() => {
                                                                const current = watch("dataGroupName");
                                                                setValue("dataGroupName", current.filter((_, i) => i !== index))
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-border" />

                        {/* Conditional Content Based on Type */}

                        {/* TYPE: TIME */}
                        {typeSchedule === "time" && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-foreground border-l-4 border-indigo-500 pl-2">
                                        {t("workTimeHeader")}
                                    </h3>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300"
                                        onClick={() => appendScene({ time: "00:00", dim: "100", open_volt: null, open_time: null, close_volt: null, close_time: null })}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        {t("addWork")}
                                    </Button>
                                </div>

                                <div className="border rounded-xl shadow-sm overflow-hidden bg-background">
                                    {/* Table Header */}
                                    <div className="grid grid-cols-[1fr_1fr_60px] bg-indigo-50/50 dark:bg-indigo-950/20 p-3 text-xs font-semibold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider border-b border-indigo-100 dark:border-indigo-900">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3 h-3" />
                                            {t("workTimeHeader")}
                                        </div>
                                        <div className="pl-2">{t("brightnessHeader")}</div>
                                        <div className="text-center">{t("deleteHeader")}</div>
                                    </div>

                                    {/* Table Body */}
                                    {sceneFields.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground bg-muted/30 flex flex-col items-center gap-2">
                                            <span>Click "Add Task" to create a time schedule.</span>
                                            {(form.formState.errors.listScenes as any)?.message && (
                                                <span className="text-sm text-red-500 font-medium">
                                                    {(form.formState.errors.listScenes as any)?.message}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="max-h-[300px] overflow-y-auto divide-y divide-border relative">
                                            {(form.formState.errors.listScenes as any)?.message && (
                                                <div className="sticky top-0 z-20 bg-destructive/10 text-destructive text-xs font-medium p-2 text-center border-b border-destructive/20">
                                                    {(form.formState.errors.listScenes as any)?.message}
                                                </div>
                                            )}
                                            {sceneFields.map((field, index) => (
                                                <div key={field.id} className="grid grid-cols-[1fr_1fr_60px] p-3 items-start gap-4 hover:bg-muted/30 transition-colors group">
                                                    <div className="flex flex-col gap-1">
                                                        <Input
                                                            {...form.register(`listScenes.${index}.time`)}
                                                            type="time"
                                                            className={`h-9 font-medium border-input focus:border-indigo-500 bg-background ${form.formState.errors.listScenes?.[index]?.time ? "border-destructive" : ""}`}
                                                        />
                                                        {form.formState.errors.listScenes?.[index]?.time && (
                                                            <span className="text-xs text-red-500 ml-1">
                                                                {form.formState.errors.listScenes[index]?.time?.message}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="relative flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 relative">
                                                                <Input
                                                                    {...form.register(`listScenes.${index}.dim`)}
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    className={`h-9 bg-background border-input focus:border-indigo-500 pr-8 ${form.formState.errors.listScenes?.[index]?.dim ? "border-destructive" : ""}`}
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 select-none">%</span>
                                                            </div>
                                                        </div>
                                                        {form.formState.errors.listScenes?.[index]?.dim && (
                                                            <span className="text-xs text-red-500 ml-1">
                                                                {form.formState.errors.listScenes[index]?.dim?.message}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-center items-center h-full pt-0.5">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
                                                            onClick={() => removeScene(index)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TYPE: LIGHT */}
                        {typeSchedule === "light" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h3 className="text-sm font-semibold text-foreground border-l-4 border-amber-500 pl-2">
                                    {t("lightIntensitySetting")}
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Open Section */}
                                    <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 p-5 rounded-xl space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                                            <h4 className="font-semibold text-amber-900 dark:text-amber-200">{t("lightOpen")}</h4>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-amber-700 dark:text-amber-300 font-medium">Brightness Threshold (Lux)</label>
                                                <div className="relative">
                                                    <Input
                                                        {...form.register(`listScenes.0.open_volt`)}
                                                        type="number"
                                                        className={`pr-10 border-amber-200 focus:border-amber-500 dark:bg-amber-950/30 ${form.formState.errors.listScenes?.[0]?.open_volt ? "border-destructive" : ""}`}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-amber-400">{t("lux")}</span>
                                                </div>
                                                {form.formState.errors.listScenes?.[0]?.open_volt && (
                                                    <span className="text-xs text-red-500 font-medium">
                                                        {form.formState.errors.listScenes[0]?.open_volt?.message}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-amber-700 dark:text-amber-300 font-medium">Output Brightness (%)</label>
                                                <div className="relative">
                                                    <Input
                                                        {...form.register(`listScenes.0.open_time`)}
                                                        type="number"
                                                        className={`pr-10 border-amber-200 focus:border-amber-500 dark:bg-amber-950/30 ${form.formState.errors.listScenes?.[0]?.open_time ? "border-destructive" : ""}`}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-amber-400">{t("percent")}</span>
                                                </div>
                                                {form.formState.errors.listScenes?.[0]?.open_time && (
                                                    <span className="text-xs text-red-500 font-medium">
                                                        {form.formState.errors.listScenes[0]?.open_time?.message}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Close Section */}
                                    <div className="bg-muted/20 border border-border p-5 rounded-xl space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-gray-500" />
                                            <h4 className="font-semibold text-foreground">{t("lightClose")}</h4>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-muted-foreground font-medium">Brightness Threshold (Lux)</label>
                                                <div className="relative">
                                                    <Input
                                                        {...form.register(`listScenes.0.close_volt`)}
                                                        type="number"
                                                        className={`pr-10 ${form.formState.errors.listScenes?.[0]?.close_volt ? "border-destructive" : ""}`}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">{t("lux")}</span>
                                                </div>
                                                {form.formState.errors.listScenes?.[0]?.close_volt && (
                                                    <span className="text-xs text-red-500 font-medium">
                                                        {form.formState.errors.listScenes[0]?.close_volt?.message}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-muted-foreground font-medium">Output Brightness (%)</label>
                                                <div className="relative">
                                                    <Input
                                                        {...form.register(`listScenes.0.close_time`)}
                                                        type="number"
                                                        className={`pr-10 ${form.formState.errors.listScenes?.[0]?.close_time ? "border-destructive" : ""}`}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">{t("percent")}</span>
                                                </div>
                                                {form.formState.errors.listScenes?.[0]?.close_time && (
                                                    <span className="text-xs text-red-500 font-medium">
                                                        {form.formState.errors.listScenes[0]?.close_time?.message}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TYPE: MANUAL */}
                        {typeSchedule === "manual" && (
                            <div className="p-8 bg-muted/20 rounded-xl border border-dashed flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                                    <span className="text-2xl">✋</span>
                                </div>
                                <h3 className="font-semibold text-foreground">Manual Mode Selected</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                                    Sensors are disabled. Lights will be controlled manually via the Control interface.
                                </p>
                            </div>
                        )}
                    </form>
                </div>

                <div className="p-6 border-t bg-muted/40 rounded-b-lg flex justify-end gap-3 sticky bottom-0 z-10">
                    <Button
                        type="button"
                        variant="outline"
                        className="h-11 px-6 border-input text-foreground bg-background hover:bg-muted shadow-sm"
                        onClick={() => onOpenChange(false)}
                    >
                        {t("cancel")}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit(onSubmit, (errors) => {
                            toast.error(t("validateError"));
                        })}
                        disabled={isSaving}
                        className="h-11 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("saving")}
                            </>
                        ) : (
                            t("save")
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
