"use client"

import * as React from "react"
import { useForm, useWatch } from "react-hook-form"
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DEFAULT_PROJECT, COLOR_PRESET_BG_CLASSES } from "@/config/projects"
import { PersonalItem, RoleItem, checkPersonalUsername, resetPersonalPassword } from "@/app/actions/personal"
import type { ProjectConfig } from "@/config/projects/types"
import type { KeycloakRoleItem } from "@/types/menu-settings"
import { useTranslations } from "next-intl"
import { ChevronsUpDown, X, ShieldCheck, Layers, Copy, Check, RefreshCw, KeyRound, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function generateRandomPassword(length = 12): string {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const lowercase = "abcdefghijklmnopqrstuvwxyz"
    const numbers = "0123456789"
    const all = uppercase + lowercase + numbers

    const getRandom = (chars: string) => chars[Math.floor(Math.random() * chars.length)]

    const required = [
        getRandom(uppercase),
        getRandom(lowercase),
        getRandom(numbers),
    ]

    const remainingLength = Math.max(0, length - required.length)
    const rest: string[] = []
    for (let i = 0; i < remainingLength; i++) {
        rest.push(getRandom(all))
    }

    const combined = [...required, ...rest]
    for (let i = combined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[combined[i], combined[j]] = [combined[j], combined[i]]
    }

    return combined.join("")
}

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
    isWritable?: boolean
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
    isWritable = true,
}: PersonalFormProps) {
    const t = useTranslations('Personal')
    const [isProjectPopoverOpen, setIsProjectPopoverOpen] = React.useState(false)
    const [copiedPassword, setCopiedPassword] = React.useState(false)
    const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false)
    const [isResettingPassword, setIsResettingPassword] = React.useState(false)
    const [lastResetPassword, setLastResetPassword] = React.useState<string | null>(null)

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

    const superAdminRole = React.useMemo(() => {
        return (
            realmRoles.find((r) => (r.name || "").toLowerCase().includes("superadmin")) ||
            realmRoles.find((r) => (r.code || "").toLowerCase().includes("superadmin"))
        )
    }, [realmRoles])

    const isSuperAdminRole = React.useCallback((name?: string, id?: string) => {
        const lower = (name || "").toLowerCase()
        return (
            lower.includes("superadmin") ||
            lower.includes("super_admin") ||
            lower.includes("super-admin") ||
            (Boolean(superAdminRole?.id) && Boolean(id) && id === superAdminRole?.id)
        )
    }, [superAdminRole])

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
                    p.id.toLowerCase() === projectId.toLowerCase() ||
                    p.uuid?.toLowerCase() === projectId.toLowerCase() ||
                    p.code?.toLowerCase() === projectId.toLowerCase() ||
                    p.code?.toLowerCase().replace(/_/g, "-") === projectId.toLowerCase().replace(/_/g, "-") ||
                    p.domain?.split(".")[0]?.toLowerCase() === projectId.toLowerCase()
            )
            const pid = project?.id || projectId
            const puuid = project?.uuid || ""
            const pcode = project?.code?.toLowerCase() || ""

            const list =
                rolesByProject[pid] ||
                rolesByProject[pid.toLowerCase()] ||
                rolesByProject[puuid] ||
                rolesByProject[puuid.toLowerCase()] ||
                rolesByProject[pcode] ||
                rolesByProject[pcode.replace(/_/g, "-")] ||
                rolesByProject[projectId] ||
                rolesByProject[projectId.toLowerCase()]
            let res = flattenedRoles
            if (list && list.length > 0) {
                res = list.map((r) => ({ id: r.id, name: r.name }))
            }

            // Ensure initial role for this user is always present in options so Select doesn't render empty
            if (initialData) {
                const cleanProj = resolveToProjectId(projectId).toLowerCase()
                const assignedRole = initialData.project_roles?.find((pr) => {
                    const cleanPrPid = resolveToProjectId(pr.project_id).toLowerCase()
                    return (
                        cleanPrPid === cleanProj ||
                        pr.project_id.toLowerCase() === projectId.toLowerCase() ||
                        pr.project_id.toLowerCase() === pid.toLowerCase() ||
                        pr.project_id.toLowerCase() === puuid.toLowerCase() ||
                        pr.project_id.toLowerCase() === pcode.toLowerCase()
                    )
                })
                const assignedRoleId = assignedRole?.role_id || (initialData.project_id && resolveToProjectId(initialData.project_id).toLowerCase() === cleanProj ? initialData.roles_id : undefined)
                const assignedRoleName = assignedRole?.role_name || initialData.roleName
                if (assignedRoleId && assignedRoleName && !res.some((r) => r.id.toLowerCase() === assignedRoleId.toLowerCase())) {
                    res = [...res, { id: assignedRoleId, name: assignedRoleName }]
                }
            }

            return res.filter((r) => !isSuperAdminRole(r.name, r.id))
        },
        [projects, rolesByProject, flattenedRoles, isSuperAdminRole, initialData, resolveToProjectId]
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
            return initialData.project_roles.map((pr) => {
                const pid = resolveToProjectId(pr.project_id) || pr.project_id
                const availRoles = getRolesForProject(pid)
                const matching = availRoles.find(
                    (r) =>
                        r.id.toLowerCase() === pr.role_id.toLowerCase() ||
                        (pr.role_name && r.name.toLowerCase() === pr.role_name.toLowerCase())
                )
                return {
                    project_id: pid,
                    role_id: matching ? matching.id : pr.role_id,
                }
            })
        }
        const initialRole = initialData?.roles_id ? String(initialData.roles_id) : ""
        return defaultProjects.map((pid) => {
            const availRoles = getRolesForProject(pid)
            const matching = availRoles.find((r) => r.id.toLowerCase() === initialRole.toLowerCase())
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
            roleName.includes("super_admin") ||
            roleName.includes("super-admin") ||
            (Boolean(superAdminRole?.id) && initialData.roles_id === superAdminRole?.id)
        )
    }, [initialData, superAdminRole])

    const form = useForm<PersonalFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            personal_firstname: initialData?.first_name || "",
            personal_lastname: initialData?.last_name || "",
            personal_username: initialData?.personal_username || "",
            personal_email: initialData?.personal_email || initialData?.email || "",
            personal_password: initialData ? "" : generateRandomPassword(),
            access_level: isInitialSuperAdmin ? "SUPER_ADMIN" : "PROJECT_SCOPED",
            roles_id: isInitialSuperAdmin ? (superAdminRole?.id || "") : (defaultProjectRoles[0]?.role_id || ""),
            project_ids: isInitialSuperAdmin ? projects.map((p) => p.id) : defaultProjects,
            project_roles: isInitialSuperAdmin ? [] : defaultProjectRoles,
        },
    })

    const accessLevel = useWatch({ control: form.control, name: "access_level" })
    const watchedProjectRoles = useWatch({ control: form.control, name: "project_roles" })
    const watchedPassword = useWatch({ control: form.control, name: "personal_password" })

    const handleCopyPassword = React.useCallback(async () => {
        const pwd = form.getValues("personal_password")
        if (!pwd) return
        try {
            await navigator.clipboard.writeText(pwd)
            setCopiedPassword(true)
            toast.success(t("form.passwordCopied"))
            setTimeout(() => setCopiedPassword(false), 2000)
        } catch {
            // Defensive clipboard fallback
        }
    }, [form, t])

    const handleRegeneratePassword = React.useCallback(() => {
        const newPwd = generateRandomPassword()
        form.setValue("personal_password", newPwd, { shouldValidate: true })
        toast.success(t("form.passwordRegenerated"))
    }, [form, t])

    const handleConfirmResetPassword = React.useCallback(async () => {
        if (!initialData?.personal_id || !isWritable) return

        setIsResettingPassword(true)
        try {
            const randomPwd = generateRandomPassword(12)
            const res = await resetPersonalPassword({
                personal_id: initialData.personal_id,
                password: randomPwd,
                firstName: form.getValues("personal_firstname") || initialData.first_name,
                lastName: form.getValues("personal_lastname") || initialData.last_name,
                email: form.getValues("personal_email") || initialData.personal_email || initialData.email,
            })

            if (res.result) {
                form.setValue("personal_password", randomPwd, { shouldValidate: true })
                setLastResetPassword(randomPwd)
                setIsResetConfirmOpen(false)
                toast.success(t("messages.successResetPassword"))
            } else {
                toast.error(res.message || t("messages.errorResetPassword"))
            }
        } catch {
            toast.error(t("messages.errorResetPassword"))
        } finally {
            setIsResettingPassword(false)
        }
    }, [form, initialData, isWritable, t])

    React.useEffect(() => {
        if (initialData) {
            const isSuper =
                (initialData.roleName || "").toLowerCase().includes("superadmin") ||
                (Boolean(superAdminRole?.id) && initialData.roles_id === superAdminRole?.id)

            const pRoles =
                initialData.project_roles && initialData.project_roles.length > 0
                    ? initialData.project_roles.map((pr) => {
                          const pid = resolveToProjectId(pr.project_id) || pr.project_id
                          const availRoles = getRolesForProject(pid)
                          const matched = availRoles.find(
                              (r) =>
                                  r.id.toLowerCase() === pr.role_id.toLowerCase() ||
                                  (pr.role_name && r.name.toLowerCase() === pr.role_name.toLowerCase())
                          )
                          return {
                              project_id: pid,
                              role_id: matched ? matched.id : pr.role_id,
                          }
                      })
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
                    ? (superAdminRole?.id || (initialData.roles_id ? String(initialData.roles_id) : ""))
                    : (pRoles[0]?.role_id || (initialData.roles_id ? String(initialData.roles_id) : "")),
                project_ids: isSuper ? projects.map((p) => p.id) : initialProjects,
                project_roles: isSuper ? [] : pRoles,
            })
            setLastResetPassword(null)
            setIsResetConfirmOpen(false)
        } else {
            const firstPid = projects.length > 0 ? projects[0].id : DEFAULT_PROJECT
            const availRoles = getRolesForProject(firstPid)
            const defaultRole = availRoles[0]?.id || (flattenedRoles[0]?.id || "")

            form.reset({
                personal_firstname: "",
                personal_lastname: "",
                personal_username: "",
                personal_email: "",
                personal_password: generateRandomPassword(),
                access_level: "PROJECT_SCOPED",
                roles_id: defaultRole,
                project_ids: [firstPid],
                project_roles: [{ project_id: firstPid, role_id: defaultRole }],
            })
            setLastResetPassword(null)
            setIsResetConfirmOpen(false)
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

        const submitValues: PersonalFormValues = { ...values }

        if (initialData) {
            // Password updates in Edit mode are handled exclusively via Reset Password button
            submitValues.personal_password = ""
        }

        if (submitValues.access_level === "SUPER_ADMIN") {
            submitValues.roles_id = superAdminRole?.id || ""
            submitValues.project_roles = []
            submitValues.project_ids = []
        } else {
            if (submitValues.project_roles && submitValues.project_roles.length > 0) {
                submitValues.roles_id = submitValues.project_roles[0].role_id
            }
        }

        onSubmit(submitValues)
    }

    return (
        <>
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
                            <FormLabel className="flex flex-wrap items-center gap-1.5">
                                <span>{t('form.password')}</span>
                                {!initialData && <span className="text-destructive">*</span>}
                                {initialData ? (
                                    lastResetPassword && (
                                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-normal">
                                            {t('form.resetPasswordSuccessHint')}
                                        </span>
                                    )
                                ) : (
                                    <span className="text-xs text-muted-foreground font-normal">
                                        {t('form.temporaryPasswordHint')}
                                    </span>
                                )}
                            </FormLabel>
                            <FormControl>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            type="text"
                                            readOnly
                                            placeholder={initialData ? t('form.resetPasswordPlaceholder') : t('form.passwordPlaceholder')}
                                            className={cn(
                                                "bg-muted/40 cursor-default focus-visible:ring-0",
                                                !initialData
                                                    ? "pr-16 font-mono text-sm"
                                                    : watchedPassword
                                                        ? "pr-10 font-mono text-sm"
                                                        : "text-xs"
                                            )}
                                            {...field}
                                        />
                                        {/* Action buttons inside password input */}
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-muted-foreground">
                                            {(!initialData || Boolean(watchedPassword)) && (
                                                <button
                                                    type="button"
                                                    onClick={handleCopyPassword}
                                                    title={t("form.copyPassword")}
                                                    className="p-1.5 hover:text-foreground cursor-pointer transition-colors rounded hover:bg-muted/80"
                                                >
                                                    {copiedPassword ? (
                                                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                    <span className="sr-only">{t("form.copyPassword")}</span>
                                                </button>
                                            )}
                                            {!initialData && (
                                                <button
                                                    type="button"
                                                    onClick={handleRegeneratePassword}
                                                    title={t("form.regeneratePassword")}
                                                    className="p-1.5 hover:text-foreground cursor-pointer transition-colors rounded hover:bg-muted/80"
                                                >
                                                    <RefreshCw className="h-4 w-4" />
                                                    <span className="sr-only">{t("form.regeneratePassword")}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {initialData && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsResetConfirmOpen(true)}
                                            disabled={isLoading || isResettingPassword || !isWritable}
                                            className={cn(
                                                "h-9 shrink-0 gap-1.5 px-3 text-xs cursor-pointer shadow-2xs",
                                                !isWritable && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            {isResettingPassword ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <KeyRound className="h-3.5 w-3.5" />
                                            )}
                                            <span>
                                                {isResettingPassword ? t("form.resettingPassword") : t("form.resetPassword")}
                                            </span>
                                        </Button>
                                    )}
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
                                    accessLevel === "PROJECT_SCOPED"
                                        ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                                        : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
                                )}
                            >
                                <div className={cn(
                                    "p-1.5 rounded-md mt-0.5 shrink-0",
                                    accessLevel === "PROJECT_SCOPED" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
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
                                    accessLevel === "SUPER_ADMIN"
                                        ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                                        : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
                                )}
                            >
                                <div className={cn(
                                    "p-1.5 rounded-md mt-0.5 shrink-0",
                                    accessLevel === "SUPER_ADMIN" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
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
                {accessLevel === "SUPER_ADMIN" ? (
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
                                        <Popover modal={true} open={isProjectPopoverOpen} onOpenChange={setIsProjectPopoverOpen}>
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
                                                                const colorClass = COLOR_PRESET_BG_CLASSES[project?.color || "skyblue"] || "bg-[#0895d8]"
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
                                        <PopoverContent className="w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] p-2" align="start">
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
                                            <div
                                                className="max-h-56 overflow-y-auto overscroll-contain space-y-1"
                                                onWheel={(e) => e.stopPropagation()}
                                                onTouchMove={(e) => e.stopPropagation()}
                                            >
                                                {projects.map((project) => {
                                                    const isSelected = selectedIds.includes(project.id)
                                                    const colorClass = COLOR_PRESET_BG_CLASSES[project.color || "skyblue"] || "bg-[#0895d8]"
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

                        {watchedProjectRoles?.length === 0 ? (
                            <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                                {t("form.projectsRequired")}
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {watchedProjectRoles?.map((pr) => {
                                    const project = projects.find(
                                        (p) =>
                                            p.id === pr.project_id ||
                                            p.uuid === pr.project_id ||
                                            p.code === pr.project_id
                                    )
                                    const colorClass = COLOR_PRESET_BG_CLASSES[project?.color || "skyblue"] || "bg-[#0895d8]"
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
                        disabled={isLoading || !isWritable}
                        className={cn(
                            "cursor-pointer h-9 px-4 text-xs font-medium shadow-2xs",
                            !isWritable && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isLoading ? t('form.saving') : t('form.save')}
                    </Button>
                </div>
            </form>
        </Form>

        <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("form.resetPasswordTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("form.resetPasswordDescription")}{" "}
                        <strong>
                            {initialData?.first_name} {initialData?.last_name} ({initialData?.personal_username})
                        </strong>
                        ?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="cursor-pointer" disabled={isResettingPassword}>
                        {t("form.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault()
                            handleConfirmResetPassword()
                        }}
                        disabled={isResettingPassword}
                        className="cursor-pointer"
                    >
                        {isResettingPassword ? t("form.resettingPassword") : t("form.confirm")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    )
}
