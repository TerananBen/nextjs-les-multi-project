"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DEFAULT_PROJECT } from "@/config/projects"
import { PersonalItem, RoleItem, checkPersonalUsername } from "@/app/actions/personal"
import type { ProjectConfig } from "@/config/projects/types"
import type { KeycloakRoleItem } from "@/types/menu-settings"
import { COLOR_PRESET_BG_CLASSES } from "@/components/cores/setting-system/project/columns"
import { useTranslations } from "next-intl"
import { ChevronsUpDown, X, Eye, EyeOff, ShieldCheck, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

const projectRoleSchema = z.object({
    project_id: z.string().min(1, "Project is required"),
    role_id: z.string().min(1, "Role is required"),
})

const formSchema = z.object({
    personal_firstname: z.string().min(1, "First name is required"),
    personal_lastname: z.string().min(1, "Last name is required"),
    personal_username: z.string().min(1, "Username is required"),
    personal_email: z.string().min(1, "Email is required").email("Invalid email address"),
    personal_password: z.string().optional(),
    access_level: z.enum(["PROJECT_SCOPED", "SUPER_ADMIN"]),
    roles_id: z.string().optional(),
    project_ids: z.array(z.string()).optional(),
    project_roles: z.array(projectRoleSchema).optional(),
}).superRefine((data, ctx) => {
    if (data.access_level === "PROJECT_SCOPED") {
        if (!data.project_ids || data.project_ids.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["project_ids"],
                message: "Please select at least one project",
            })
        }
        if (!data.project_roles || data.project_roles.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["project_roles"],
                message: "Please select a role for each project",
            })
        }
    }
})

export type PersonalFormValues = z.infer<typeof formSchema>

interface PersonalFormProps {
    initialData?: PersonalItem | null
    roles: RoleItem[]
    rolesByProject?: Record<string, KeycloakRoleItem[]>
    realmRoles?: KeycloakRoleItem[]
    projects: ProjectConfig[]
    canAssignSuperAdmin?: boolean
    onSubmit: (values: PersonalFormValues) => void
    onCancel: () => void
    isLoading?: boolean
}

export function PersonalForm({
    initialData,
    roles,
    rolesByProject = {},
    realmRoles = [],
    projects,
    canAssignSuperAdmin = false,
    onSubmit,
    onCancel,
    isLoading,
}: PersonalFormProps) {
    const t = useTranslations('Personal')
    const [isProjectPopoverOpen, setIsProjectPopoverOpen] = React.useState(false)
    const [showPassword, setShowPassword] = React.useState(false)

    const resolveToProjectId = React.useCallback((idOrCode: string) => {
        if (!idOrCode) return ""
        const clean = idOrCode.trim().toLowerCase()
        const found = projects.find(
            (p) =>
                p.id.toLowerCase() === clean ||
                p.uuid?.toLowerCase() === clean ||
                p.code?.toLowerCase() === clean ||
                p.code?.toLowerCase().replace(/_/g, "-") === clean.replace(/_/g, "-") ||
                p.domain?.toLowerCase().split(".")[0] === clean
        )
        return found ? found.id : idOrCode
    }, [projects])

    const isSuperAdminRole = React.useCallback((name?: string, id?: string) => {
        const lower = (name || "").toLowerCase()
        return (
            lower.includes("superadmin") ||
            lower.includes("super_admin") ||
            lower.includes("super-admin") ||
            id === "855125b5-a3ea-48aa-a9e7-7e5abbecfaca"
        )
    }, [])

    const getProjectCode = React.useCallback((p?: ProjectConfig, fallbackId?: string) => {
        if (!p) return fallbackId || ""
        return p.code || p.id
    }, [])

    // Convert global roles array to flat list as fallback (always excludes SuperAdmin from project roles)
    const flattenedRoles = React.useMemo(() => {
        const list = roles.map((roleObj) => {
            if ("id" in roleObj && "name" in roleObj) {
                const item = roleObj as unknown as { id: string; name: string }
                return { id: String(item.id), name: String(item.name) }
            }
            const id = Object.keys(roleObj)[0]
            const name = roleObj[id]
            return { id, name }
        })
        return list.filter((r) => !isSuperAdminRole(r.name, r.id))
    }, [roles, isSuperAdminRole])

    // Helper: Lookup roles available for a specific project (always excludes SuperAdmin from project roles dropdown)
    const getRolesForProject = React.useCallback(
        (projectId: string) => {
            const project = projects.find(
                (p) =>
                    p.id === projectId ||
                    p.uuid === projectId ||
                    p.code === projectId ||
                    p.domain?.split(".")[0]?.toLowerCase() === projectId.toLowerCase()
            )
            const pid = project?.id || projectId
            const puuid = project?.uuid || ""
            const pcode = project?.code?.toLowerCase() || ""

            const list = rolesByProject[pid] || rolesByProject[puuid] || rolesByProject[pcode]
            let res = flattenedRoles
            if (list && list.length > 0) {
                res = list.map((r) => ({ id: r.id, name: r.name }))
            }
            return res.filter((r) => !isSuperAdminRole(r.name, r.id))
        },
        [projects, rolesByProject, flattenedRoles, isSuperAdminRole]
    )

    const defaultProjects = React.useMemo(() => {
        if (initialData?.project_roles && initialData.project_roles.length > 0) {
            return Array.from(new Set(initialData.project_roles.map((pr) => resolveToProjectId(pr.project_id)).filter(Boolean)))
        }
        if (initialData?.project_ids && initialData.project_ids.length > 0) {
            return Array.from(new Set(initialData.project_ids.map(resolveToProjectId).filter(Boolean)))
        }
        if (initialData?.project_id) {
            return [resolveToProjectId(initialData.project_id)]
        }
        return projects.length > 0 ? [projects[0].id] : [DEFAULT_PROJECT]
    }, [initialData, projects, resolveToProjectId])

    const defaultProjectRoles = React.useMemo(() => {
        if (initialData?.project_roles && initialData.project_roles.length > 0) {
            return initialData.project_roles.map((pr) => ({
                project_id: resolveToProjectId(pr.project_id) || pr.project_id,
                role_id: pr.role_id,
            }))
        }
        const initialRole = initialData?.roles_id ? String(initialData.roles_id) : ""
        return defaultProjects.map((pid) => {
            const availRoles = getRolesForProject(pid)
            const matching = availRoles.find((r) => r.id === initialRole)
            return {
                project_id: pid,
                role_id: matching ? matching.id : (availRoles[0]?.id || initialRole),
            }
        })
    }, [initialData, defaultProjects, resolveToProjectId, getRolesForProject])

    const isInitialSuperAdmin = React.useMemo(() => {
        if (!initialData) return false
        const roleName = (initialData.roleName || "").toLowerCase()
        return (
            roleName.includes("superadmin") ||
            initialData.roles_id === "855125b5-a3ea-48aa-a9e7-7e5abbecfaca"
        )
    }, [initialData])

    const superAdminRole = React.useMemo(() => {
        return (
            realmRoles.find((r) => r.name.toLowerCase() === "superadmin") ||
            realmRoles.find((r) => r.code?.toLowerCase() === "superadmin") || {
                id: "855125b5-a3ea-48aa-a9e7-7e5abbecfaca",
                name: "SuperAdmin",
                code: "SuperAdmin",
            }
        )
    }, [realmRoles])

    const form = useForm<PersonalFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            personal_firstname: initialData?.first_name || "",
            personal_lastname: initialData?.last_name || "",
            personal_username: initialData?.personal_username || "",
            personal_email: initialData?.personal_email || initialData?.email || "",
            personal_password: "",
            access_level: isInitialSuperAdmin ? "SUPER_ADMIN" : "PROJECT_SCOPED",
            roles_id: isInitialSuperAdmin ? superAdminRole.id : (defaultProjectRoles[0]?.role_id || ""),
            project_ids: isInitialSuperAdmin ? projects.map((p) => p.id) : defaultProjects,
            project_roles: isInitialSuperAdmin ? [] : defaultProjectRoles,
        },
    })

    React.useEffect(() => {
        if (initialData) {
            const isSuper =
                (initialData.roleName || "").toLowerCase().includes("superadmin") ||
                initialData.roles_id === "855125b5-a3ea-48aa-a9e7-7e5abbecfaca"

            const pRoles =
                initialData.project_roles && initialData.project_roles.length > 0
                    ? initialData.project_roles.map((pr) => ({
                          project_id: resolveToProjectId(pr.project_id) || pr.project_id,
                          role_id: pr.role_id,
                      }))
                    : (Array.isArray(initialData.project_ids) && initialData.project_ids.length > 0
                          ? initialData.project_ids
                          : initialData.project_id
                          ? [initialData.project_id]
                          : (projects.length > 0 ? [projects[0].id] : [DEFAULT_PROJECT])
                      )
                          .map(resolveToProjectId)
                          .filter(Boolean)
                          .map((pid) => {
                              const availRoles = getRolesForProject(pid)
                              const match = availRoles.find((r) => r.id === String(initialData.roles_id))
                              return {
                                  project_id: pid,
                                  role_id: match ? match.id : (availRoles[0]?.id || String(initialData.roles_id || "")),
                              }
                          })

            const initialProjects = Array.from(new Set(pRoles.map((pr) => pr.project_id)))

            form.reset({
                personal_firstname: initialData.first_name || "",
                personal_lastname: initialData.last_name || "",
                personal_username: initialData.personal_username || "",
                personal_email: initialData.personal_email || initialData.email || "",
                personal_password: "",
                access_level: isSuper ? "SUPER_ADMIN" : "PROJECT_SCOPED",
                roles_id: isSuper
                    ? superAdminRole.id
                    : (pRoles[0]?.role_id || (initialData.roles_id ? String(initialData.roles_id) : "")),
                project_ids: isSuper ? projects.map((p) => p.id) : initialProjects,
                project_roles: isSuper ? [] : pRoles,
            })
        } else {
            const firstPid = projects.length > 0 ? projects[0].id : DEFAULT_PROJECT
            const availRoles = getRolesForProject(firstPid)
            const defaultRole = availRoles[0]?.id || (flattenedRoles[0]?.id || "")

            form.reset({
                personal_firstname: "",
                personal_lastname: "",
                personal_username: "",
                personal_email: "",
                personal_password: "",
                access_level: "PROJECT_SCOPED",
                roles_id: defaultRole,
                project_ids: [firstPid],
                project_roles: [{ project_id: firstPid, role_id: defaultRole }],
            })
        }
    }, [initialData, form, projects, resolveToProjectId, getRolesForProject, flattenedRoles, superAdminRole])

    // Synchronize project_roles whenever selected project_ids change
    const handleProjectsChange = (newProjectIds: string[]) => {
        form.setValue("project_ids", newProjectIds, { shouldValidate: true })
        const currentProjectRoles = form.getValues("project_roles") || []
        const updatedProjectRoles: { project_id: string; role_id: string }[] = []

        for (const pid of newProjectIds) {
            const existing = currentProjectRoles.find((pr) => pr.project_id === pid)
            if (existing) {
                updatedProjectRoles.push(existing)
            } else {
                const availRoles = getRolesForProject(pid)
                const fallbackRole = availRoles[0]?.id || ""
                updatedProjectRoles.push({
                    project_id: pid,
                    role_id: fallbackRole,
                })
            }
        }
        form.setValue("project_roles", updatedProjectRoles, { shouldValidate: true })
        if (updatedProjectRoles.length > 0) {
            form.setValue("roles_id", updatedProjectRoles[0].role_id)
        }
    }

    // Update role for a specific project
    const handleRoleChangeForProject = (projectId: string, roleId: string) => {
        const currentProjectRoles = form.getValues("project_roles") || []
        const next = currentProjectRoles.map((pr) =>
            pr.project_id === projectId ? { ...pr, role_id: roleId } : pr
        )
        form.setValue("project_roles", next, { shouldValidate: true })
        if (next.length > 0 && next[0].project_id === projectId) {
            form.setValue("roles_id", roleId)
        }
    }

    const handleSubmit = async (values: PersonalFormValues) => {
        // Check if username is changed or new
        if (!initialData || initialData.personal_username !== values.personal_username) {
            const checkResult = await checkPersonalUsername(values.personal_username)
            if (checkResult && checkResult.result && checkResult.dataReturn === '1') {
                form.setError("personal_username", {
                    type: "manual",
                    message: t('form.usernameExists'),
                })
                return
            }
        }

        // Password is required for new users
        if (!initialData && !values.personal_password) {
            form.setError("personal_password", {
                type: "manual",
                message: t('form.required'),
            })
            return
        }

        if (values.access_level === "SUPER_ADMIN") {
            values.roles_id = superAdminRole.id
            values.project_roles = []
            values.project_ids = []
        } else {
            if (values.project_roles && values.project_roles.length > 0) {
                values.roles_id = values.project_roles[0].role_id
            }
        }

        onSubmit(values)
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5 max-h-[calc(85vh-130px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="personal_firstname"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('form.firstName')} <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                    <Input placeholder={t('form.firstName')} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="personal_lastname"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('form.lastName')} <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                    <Input placeholder={t('form.lastName')} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="personal_username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('form.username')} <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t('form.username')}
                                    disabled={Boolean(initialData)}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="personal_email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('form.email')} <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                                <Input
                                    type="email"
                                    placeholder={t('form.emailPlaceholder')}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="personal_password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('form.password')} <span className="text-destructive">*</span> {initialData && t('form.passwordHint')}</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder={t('form.passwordPlaceholder')}
                                        className="pr-10"
                                        {...field}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                        <span className="sr-only">
                                            {showPassword ? "Hide password" : "Show password"}
                                        </span>
                                    </button>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Access Level Scope Selector */}
                {canAssignSuperAdmin && (
                    <div className="space-y-2 pt-1">
                        <FormLabel className="text-sm font-medium cursor-default">
                            {t("form.accessLevel")}
                        </FormLabel>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div
                                onClick={() => form.setValue("access_level", "PROJECT_SCOPED", { shouldValidate: true })}
                                className={cn(
                                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                    form.watch("access_level") === "PROJECT_SCOPED"
                                        ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                                        : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
                                )}
                            >
                                <div className={cn(
                                    "p-1.5 rounded-md mt-0.5 shrink-0",
                                    form.watch("access_level") === "PROJECT_SCOPED" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}>
                                    <Layers className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col text-left min-w-0">
                                    <span className="text-xs font-semibold text-foreground truncate">
                                        {t("form.scopedAccess")}
                                    </span>
                                    <span className="text-[11px] leading-tight text-muted-foreground mt-0.5 line-clamp-2">
                                        {t("form.scopedAccessHint")}
                                    </span>
                                </div>
                            </div>

                            <div
                                onClick={() => form.setValue("access_level", "SUPER_ADMIN", { shouldValidate: true })}
                                className={cn(
                                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                    form.watch("access_level") === "SUPER_ADMIN"
                                        ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                                        : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
                                )}
                            >
                                <div className={cn(
                                    "p-1.5 rounded-md mt-0.5 shrink-0",
                                    form.watch("access_level") === "SUPER_ADMIN" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}>
                                    <ShieldCheck className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col text-left min-w-0">
                                    <span className="text-xs font-semibold text-foreground truncate">
                                        {t("form.globalAccess")}
                                    </span>
                                    <span className="text-[11px] leading-tight text-muted-foreground mt-0.5 line-clamp-2">
                                        {t("form.globalAccessHint")}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Conditional: SuperAdmin Banner vs. Project Roles Assignment */}
                {form.watch("access_level") === "SUPER_ADMIN" ? (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-xs font-semibold text-foreground">
                                {t("form.superAdminBannerTitle")}
                            </span>
                            <Badge className="bg-primary/90 text-primary-foreground font-semibold text-[10px] py-0 px-1.5 h-4 border-0">
                                SuperAdmin
                            </Badge>
                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed py-0 px-1.5 h-4">
                                {t("table.allProjects")}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {t("form.superAdminBannerDesc")}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Multiple Projects Selection */}
                        <FormField
                            control={form.control}
                            name="project_ids"
                            render={({ field }) => {
                                const selectedIds: string[] = field.value || []
                                return (
                                    <FormItem className="flex flex-col">
                                        <FormLabel
                                            asChild
                                            className="cursor-default"
                                        >
                                            <div
                                                className="text-sm font-medium leading-none"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                }}
                                            >
                                                {t('form.projects')} <span className="text-destructive">*</span>
                                            </div>
                                        </FormLabel>
                                        <Popover open={isProjectPopoverOpen} onOpenChange={setIsProjectPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                    type="button"
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={isProjectPopoverOpen}
                                                    className={cn(
                                                        "w-full justify-between h-auto min-h-10 py-1.5 px-3 text-left font-normal cursor-pointer hover:bg-muted/30",
                                                        selectedIds.length === 0 && "text-muted-foreground"
                                                    )}
                                                >
                                                    <div className="flex flex-wrap gap-1.5 items-center flex-1 pr-2">
                                                        {selectedIds.length > 0 ? (
                                                            selectedIds.map((projectId) => {
                                                                const project = projects.find((p) => p.id === projectId || p.uuid === projectId || p.code === projectId)
                                                                const colorClass = COLOR_PRESET_BG_CLASSES[project?.color || "skyblue"] || "bg-sky-500"
                                                                return (
                                                                    <Badge
                                                                        key={projectId}
                                                                        variant="secondary"
                                                                        className="gap-1.5 py-0.5 px-2 text-xs font-normal"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            const next = selectedIds.filter((id) => id !== projectId)
                                                                            handleProjectsChange(next)
                                                                        }}
                                                                    >
                                                                        <span className={cn("h-2 w-2 rounded-full shrink-0", colorClass)} />
                                                                        <span className="truncate max-w-[140px]">{project?.name || projectId}</span>
                                                                        <X className="h-3 w-3 hover:text-destructive cursor-pointer" />
                                                                    </Badge>
                                                                )
                                                            })
                                                        ) : (
                                                            <span>{t("form.selectProjectsPlaceholder")}</span>
                                                        )}
                                                    </div>
                                                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[450px] p-2" align="start">
                                            <div className="flex items-center justify-between pb-2 mb-2 border-b px-1 text-xs text-muted-foreground">
                                                <span>{t("form.selectedCount", { count: selectedIds.length })}</span>
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs px-2 cursor-pointer"
                                                        onClick={() => handleProjectsChange(projects.map((p) => p.id))}
                                                    >
                                                        {t("form.selectAll")}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs px-2 cursor-pointer text-muted-foreground"
                                                        onClick={() => handleProjectsChange([])}
                                                    >
                                                        {t("form.deselectAll")}
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="max-h-56 overflow-y-auto space-y-1">
                                                {projects.map((project) => {
                                                    const isSelected = selectedIds.includes(project.id)
                                                    const colorClass = COLOR_PRESET_BG_CLASSES[project.color || "skyblue"] || "bg-sky-500"
                                                    return (
                                                        <div
                                                            key={project.id}
                                                            className={cn(
                                                                "flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors",
                                                                isSelected && "bg-accent/50"
                                                            )}
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    handleProjectsChange(selectedIds.filter((id) => id !== project.id))
                                                                } else {
                                                                    handleProjectsChange([...selectedIds, project.id])
                                                                }
                                                            }}
                                                        >
                                                            <Checkbox
                                                                checked={isSelected}
                                                                className="pointer-events-none"
                                                            />
                                                            <span className={cn("h-3 w-3 rounded-full shrink-0 border border-border/50", colorClass)} />
                                                            <div className="flex flex-col flex-1 min-w-0">
                                                                <span className="text-sm font-medium leading-tight truncate">
                                                                    {project.name}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground font-mono">
                                                                    {getProjectCode(project, project.id)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )
                        }}
                    />

                    {/* Scoped Role Assignment per Project */}
                    <div className="space-y-2.5 pt-1">
                        <FormLabel className="text-sm font-medium cursor-default">
                            {t("form.rolePerProject")} <span className="text-destructive">*</span>
                        </FormLabel>

                        {form.watch("project_roles")?.length === 0 ? (
                            <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                                {t("form.projectsRequired")}
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {form.watch("project_roles")?.map((pr) => {
                                    const project = projects.find(
                                        (p) =>
                                            p.id === pr.project_id ||
                                            p.uuid === pr.project_id ||
                                            p.code === pr.project_id
                                    )
                                    const colorClass = COLOR_PRESET_BG_CLASSES[project?.color || "skyblue"] || "bg-sky-500"
                                    const availRoles = getRolesForProject(pr.project_id)

                                    return (
                                        <div
                                            key={pr.project_id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border bg-card hover:bg-accent/20 transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0 border border-border/50", colorClass)} />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-medium leading-none truncate">
                                                        {project?.name || pr.project_id}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground font-mono mt-0.5">
                                                        {getProjectCode(project, pr.project_id)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="w-full sm:w-52 shrink-0">
                                                <Select
                                                    value={pr.role_id}
                                                    onValueChange={(val) => handleRoleChangeForProject(pr.project_id, val)}
                                                >
                                                    <SelectTrigger className="w-full h-8 text-xs cursor-pointer bg-background">
                                                        <SelectValue placeholder={t("form.selectRole")} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availRoles.map((role) => (
                                                            <SelectItem
                                                                key={role.id}
                                                                value={role.id}
                                                                className="text-xs cursor-pointer"
                                                            >
                                                                {role.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                        <FormField
                            control={form.control}
                            name="project_roles"
                            render={() => <FormMessage />}
                        />
                    </div>
                </>
            )}
                </div>

                <div className="border-t border-border/40 bg-muted/20 px-6 py-3 flex items-center justify-end gap-2 shrink-0 rounded-b-lg">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="cursor-pointer h-9 px-4 text-xs shadow-2xs"
                    >
                        {t('form.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        size="sm"
                        disabled={isLoading}
                        className="cursor-pointer h-9 px-4 text-xs font-medium shadow-2xs"
                    >
                        {isLoading ? t('form.saving') : t('form.save')}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
