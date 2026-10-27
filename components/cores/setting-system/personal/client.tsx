"use client"

import * as React from "react"


import { Search, Plus, X, Calendar as CalendarIcon } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { DataTable } from "./data-table"
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

import { PersonalItem, RoleItem, savePersonal, setPersonalUsable, deletePersonal, SavePersonalParams } from "@/app/actions/personal"
import type { ProjectConfig } from "@/config/projects/types"
import type { KeycloakRoleItem } from "@/types/menu-settings"
import { getColumns } from "./columns"
import { PersonalForm, PersonalFormValues } from "./personal-form"

interface PersonalClientProps {
    initialData: PersonalItem[]
    roles: RoleItem[]
    rolesByProject?: Record<string, KeycloakRoleItem[]>
    realmRoles?: KeycloakRoleItem[]
    projects: ProjectConfig[]
    isSuperAdmin?: boolean
    currentProjectId?: string
}

export function PersonalClient({
    initialData,
    roles,
    rolesByProject = {},
    realmRoles = [],
    projects,
    isSuperAdmin = false,
    currentProjectId,
}: PersonalClientProps) {
    const router = useRouter()
    const t = useTranslations('Personal')
    const [data, setData] = React.useState<PersonalItem[]>(initialData)

    // Project Map lookup for columns and badges
    const projectMap = React.useMemo(() => {
        const map = new Map<string, string>()
        projects.forEach((p) => {
            map.set(p.id, p.name)
            if (p.uuid) map.set(p.uuid, p.name)
            if (p.code) map.set(p.code, p.name)
        })
        return map
    }, [projects])

    const initialProjectFilter = React.useMemo(() => {
        if (isSuperAdmin) return "ALL"
        if (!currentProjectId) return "ALL"
        const matched = projects.find(
            (p) => p.id === currentProjectId || p.code === currentProjectId || p.uuid === currentProjectId
        )
        return matched?.id || currentProjectId
    }, [isSuperAdmin, currentProjectId, projects])

    // Filter State
    const [searchQuery, setSearchQuery] = React.useState("")
    const [projectFilter, setProjectFilter] = React.useState(initialProjectFilter)
    const [roleFilter, setRoleFilter] = React.useState("ALL")
    const [statusFilter, setStatusFilter] = React.useState("ALL")
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined)
    const [isCalendarOpen, setIsCalendarOpen] = React.useState(false)

    React.useEffect(() => {
        setProjectFilter(initialProjectFilter)
    }, [initialProjectFilter])

    // Modal State
    const [isEditOpen, setIsEditOpen] = React.useState(false)
    const [editingPersonal, setEditingPersonal] = React.useState<PersonalItem | null>(null)
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
    const [deletingPersonal, setDeletingPersonal] = React.useState<PersonalItem | null>(null)
    const [isLoading, setIsLoading] = React.useState(false)

    // Status Confirmation State
    const [isStatusConfirmOpen, setIsStatusConfirmOpen] = React.useState(false)
    const [personalToToggle, setPersonalToToggle] = React.useState<PersonalItem | null>(null)

    // Update local data when initialData changes (e.g. after router.refresh)
    React.useEffect(() => {
        setData(initialData)
    }, [initialData])

    // Convert roles to a flat list for select
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
        if (!isSuperAdmin) {
            return list.filter((r) => !r.name.toLowerCase().includes("superadmin"))
        }
        return list
    }, [roles, isSuperAdmin])

    // Filter Logic: Search + Project + Role + Status + Last Login Date/Time
    const filteredData = React.useMemo(() => {
        return data.filter((item) => {
            // Hide SuperAdmin accounts from table for non-SuperAdmin users
            if (!isSuperAdmin) {
                const rName = (item.roleName || "").toLowerCase()
                if (
                    rName.includes("superadmin") ||
                    rName.includes("super_admin") ||
                    rName.includes("super-admin") ||
                    item.roles_id === "855125b5-a3ea-48aa-a9e7-7e5abbecfaca"
                ) {
                    return false
                }
            }

            // Project Filter: SuperAdmin can choose, non-SuperAdmin is locked to currentProjectId
            const targetFilter = isSuperAdmin ? projectFilter : (currentProjectId || "ALL")
            if (targetFilter !== "ALL") {
                const selectedProj = projects.find(
                    (p) => p.id === targetFilter || p.code === targetFilter || p.uuid === targetFilter
                )
                const targetIds = selectedProj
                    ? [selectedProj.id, selectedProj.code, selectedProj.uuid].filter(Boolean)
                    : [targetFilter]

                const matchProject = targetIds.some(
                    (tid) =>
                        item.project_id === tid ||
                        (Array.isArray(item.project_ids) && item.project_ids.includes(tid!)) ||
                        (Array.isArray(item.project_roles) && item.project_roles.some((pr) => pr.project_id === tid))
                )
                if (!matchProject) {
                    return false
                }
            }

            if (searchQuery.trim()) {
                const lowerQuery = searchQuery.toLowerCase().trim()
                const matchFirstName = item.first_name?.toLowerCase().includes(lowerQuery)
                const matchLastName = item.last_name?.toLowerCase().includes(lowerQuery)
                const matchFullName = `${item.first_name || ""} ${item.last_name || ""}`.toLowerCase().includes(lowerQuery)
                const matchUsername = item.personal_username?.toLowerCase().includes(lowerQuery)
                const matchRole = item.roleName?.toLowerCase().includes(lowerQuery)
                const matchEmail = (item.email || item.personal_email || "")?.toLowerCase().includes(lowerQuery)

                if (!matchFirstName && !matchLastName && !matchFullName && !matchUsername && !matchRole && !matchEmail) {
                    return false
                }
            }

            if (roleFilter !== "ALL") {
                const itemRoleId = item.roles_id ? String(item.roles_id) : ""
                if (itemRoleId !== roleFilter) {
                    return false
                }
            }

            if (statusFilter !== "ALL") {
                const itemStatus = item.usable || "N"
                if (itemStatus !== statusFilter) {
                    return false
                }
            }

            if (selectedDate) {
                if (!item.last_login || item.last_login === "-") {
                    return false
                }

                let itemDate: Date | null = null
                const parsed = new Date(item.last_login)
                if (!isNaN(parsed.getTime())) {
                    itemDate = parsed
                } else if (item.last_login.includes("/")) {
                    const parts = item.last_login.split(/[\s/:]+/)
                    if (parts.length >= 3) {
                        const d = parseInt(parts[0], 10)
                        const m = parseInt(parts[1], 10) - 1
                        const y = parseInt(parts[2], 10)
                        const dt = new Date(y, m, d)
                        if (!isNaN(dt.getTime())) {
                            itemDate = dt
                        }
                    }
                }

                if (!itemDate) {
                    return false
                }

                const isSameDay =
                    itemDate.getFullYear() === selectedDate.getFullYear() &&
                    itemDate.getMonth() === selectedDate.getMonth() &&
                    itemDate.getDate() === selectedDate.getDate()
                if (!isSameDay) {
                    return false
                }
            }

            return true
        })
    }, [data, searchQuery, projectFilter, roleFilter, statusFilter, selectedDate, isSuperAdmin, currentProjectId, projects])

    const handleEdit = React.useCallback((personal: PersonalItem) => {
        setEditingPersonal(personal)
        setIsEditOpen(true)
    }, [])

    const handleAdd = React.useCallback(() => {
        setEditingPersonal(null)
        setIsEditOpen(true)
    }, [])

    const handleDeleteClick = React.useCallback((personal: PersonalItem) => {
        setDeletingPersonal(personal)
        setIsDeleteOpen(true)
    }, [])

    const handleToggleStatus = React.useCallback((personal: PersonalItem) => {
        setPersonalToToggle(personal)
        setIsStatusConfirmOpen(true)
    }, [])

    const handleConfirmToggleStatus = async () => {
        if (!personalToToggle) return

        setIsLoading(true)
        try {
            const newStatus = personalToToggle.usable === "Y" ? "N" : "Y"
            const result = await setPersonalUsable(personalToToggle.personal_id, newStatus)

            if (result && result.result) {
                toast.success(newStatus === "Y" ? t('messages.successEnable') : t('messages.successDisable'))
                setIsStatusConfirmOpen(false)
                router.refresh()
            } else {
                toast.error(t('messages.errorStatus'))
            }
        } catch {
            toast.error(t('messages.errorGeneric'))
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async (values: PersonalFormValues) => {
        setIsLoading(true)
        try {
            const isSuperAdminForm = values.access_level === "SUPER_ADMIN"
            const payload: SavePersonalParams = {
                personal_id: editingPersonal?.personal_id || '',
                personal_firstname: values.personal_firstname,
                personal_lastname: values.personal_lastname,
                personal_username: values.personal_username,
                personal_email: values.personal_email,
                email: values.personal_email,
                personal_password: values.personal_password || '', // Send null if empty string
                cmb_role: values.roles_id,
                project_ids: isSuperAdminForm ? [] : values.project_ids,
                project_id: isSuperAdminForm ? '' : (values.project_ids?.[0] || ''),
                project_roles: isSuperAdminForm ? [] : values.project_roles,
                actionData: editingPersonal ? "EDIT" : "ADD",
            }

            const result = await savePersonal(payload)

            if (result && result.result) {
                toast.success(editingPersonal ? t('messages.successUpdate') : t('messages.successAdd'))
                setIsEditOpen(false)
                router.refresh()
            } else {
                toast.error(result?.message || t('messages.errorSave'))
            }
        } catch {
            toast.error(t('messages.errorGeneric'))
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteConfirm = async () => {
        if (!deletingPersonal) return

        setIsLoading(true)
        try {
            const result = await deletePersonal(deletingPersonal.personal_id)
            if (result && result.result) {
                toast.success(t('messages.successDelete'))
                setIsDeleteOpen(false)
                router.refresh()
            } else {
                toast.error(result?.message || t('messages.errorDelete'))
            }
        } catch {
            toast.error(t('messages.errorGeneric'))
        } finally {
            setIsLoading(false)
        }
    }

    const columns = React.useMemo(
        () =>
            getColumns(
                {
                    onEdit: handleEdit,
                    onDelete: handleDeleteClick,
                    onToggleStatus: handleToggleStatus,
                },
                t,
                projectMap
            ),
        [t, handleEdit, handleDeleteClick, handleToggleStatus, projectMap]
    )

    const dateButtonLabel = React.useMemo(() => {
        if (!selectedDate) {
            return t('filter.lastLogin')
        }
        return format(selectedDate, "dd/MM/yyyy")
    }, [selectedDate, t])

    return (
        <div className="flex flex-1 flex-col gap-3 w-full h-full">
            {/* Header Toolbar: 2-Row Compact Container */}
            <div className="rounded-lg border bg-card p-3 shadow-2xs space-y-2.5">
                {/* Row 1: Filters (Project for SuperAdmin, Role, Status, Last Login) */}
                <div className={cn(
                    "grid grid-cols-1 gap-2.5 w-full",
                    isSuperAdmin ? "sm:grid-cols-2 md:grid-cols-4" : "sm:grid-cols-3"
                )}>
                    {/* Project Filter - Superadmin Only */}
                    {isSuperAdmin && (
                        <Select value={projectFilter} onValueChange={setProjectFilter}>
                            <SelectTrigger className="h-9 w-full bg-background cursor-pointer text-xs">
                                <SelectValue placeholder={t('filter.allProjects')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL" className="cursor-pointer text-xs">{t('filter.allProjects')}</SelectItem>
                                {projects.map((proj) => (
                                    <SelectItem key={proj.id} value={proj.id} className="cursor-pointer text-xs">
                                        {proj.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* Role Filter */}
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="h-9 w-full bg-background cursor-pointer text-xs">
                            <SelectValue placeholder={t('filter.allRoles')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL" className="cursor-pointer text-xs">{t('filter.allRoles')}</SelectItem>
                            {flattenedRoles.map((role) => (
                                <SelectItem key={role.id} value={role.id} className="cursor-pointer text-xs">
                                    {role.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Status Filter */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9 w-full bg-background cursor-pointer text-xs">
                            <SelectValue placeholder={t('filter.allStatuses')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL" className="cursor-pointer text-xs">{t('filter.allStatuses')}</SelectItem>
                            <SelectItem value="Y" className="cursor-pointer text-xs">{t('filter.active')}</SelectItem>
                            <SelectItem value="N" className="cursor-pointer text-xs">{t('filter.disabled')}</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Last Login Date Filter */}
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "h-9 w-full bg-background justify-start text-left font-normal cursor-pointer text-xs truncate",
                                    !selectedDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                <span className="truncate">{dateButtonLabel}</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => {
                                    setSelectedDate(date)
                                    setIsCalendarOpen(false)
                                }}
                                initialFocus
                            />
                            {selectedDate && (
                                <div className="p-2 border-t flex justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                                        onClick={() => {
                                            setSelectedDate(undefined)
                                            setIsCalendarOpen(false)
                                        }}
                                    >
                                        <X className="h-3.5 w-3.5 mr-1" />
                                        {t('filter.clear')}
                                    </Button>
                                </div>
                            )}
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Row 2: Search Input and Add Button */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder={t('filter.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            className="pl-9 pr-9 h-9 text-xs sm:text-sm bg-background border-input w-full shadow-2xs"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <Button onClick={handleAdd} className="cursor-pointer shrink-0 h-9 px-4 text-xs font-medium shadow-2xs w-full sm:w-auto">
                        <Plus className="mr-1.5 h-4 w-4" /> {t('addUser')}
                    </Button>
                </div>
            </div>

            {/* Middle & Bottom Table Section */}
            <div className="flex-1 flex flex-col min-h-0">
                <DataTable columns={columns} data={filteredData} loading={isLoading} />
            </div>

            {/* Edit/Add Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[550px] max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
                    <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/40 shrink-0">
                        <DialogTitle>{editingPersonal ? t('form.editTitle') : t('form.addTitle')}</DialogTitle>
                        <DialogDescription>
                            {editingPersonal
                                ? t('form.editDescription')
                                : t('form.addDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <PersonalForm
                        initialData={editingPersonal}
                        roles={roles}
                        rolesByProject={rolesByProject}
                        realmRoles={realmRoles}
                        projects={isSuperAdmin ? projects : projects.filter((p) => p.id === currentProjectId)}
                        canAssignSuperAdmin={isSuperAdmin}
                        onSubmit={handleSave}
                        onCancel={() => setIsEditOpen(false)}
                        isLoading={isLoading}
                    />
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('form.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('form.deleteDescription')} <strong>{deletingPersonal?.first_name} {deletingPersonal?.last_name}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer" disabled={isLoading}>{t('form.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleDeleteConfirm()
                            }}
                            disabled={isLoading}
                            className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
                        >
                            {isLoading ? t('form.deleting') : t('form.confirm')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Status Change Confirmation Modal */}
            <AlertDialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('form.statusTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('form.statusDescription')} <strong>{personalToToggle?.first_name} {personalToToggle?.last_name}</strong>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer" disabled={isLoading}>{t('form.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            className="cursor-pointer"
                            onClick={(e) => {
                                e.preventDefault()
                                handleConfirmToggleStatus()
                            }}
                            disabled={isLoading}
                        >
                            {isLoading ? t('form.changing') : t('form.confirm')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
