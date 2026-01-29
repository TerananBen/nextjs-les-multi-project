"use client"

import * as React from "react"


import { Search, Plus } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

import { PersonalItem, RoleItem, savePersonal, setPersonalUsable, deletePersonal } from "@/app/actions/personal"
import { getColumns } from "./columns"
import { PersonalForm, PersonalFormValues } from "@/components/personal-form"

interface PersonalClientProps {
    initialData: PersonalItem[]
    roles: RoleItem[]
}

export function PersonalClient({ initialData, roles }: PersonalClientProps) {
    const router = useRouter()
    const t = useTranslations('Personal')
    const [data, setData] = React.useState<PersonalItem[]>(initialData)
    // Filter State
    const [searchQuery, setSearchQuery] = React.useState("")

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

    // Filter Logic
    const filteredData = React.useMemo(() => {
        if (!searchQuery) return data
        const lowerQuery = searchQuery.toLowerCase()
        return data.filter(item =>
            (item.first_name && item.first_name.toLowerCase().includes(lowerQuery)) ||
            (item.last_name && item.last_name.toLowerCase().includes(lowerQuery)) ||
            (item.personal_username && item.personal_username.toLowerCase().includes(lowerQuery)) ||
            (item.roleName && item.roleName.toLowerCase().includes(lowerQuery))
        )
    }, [data, searchQuery])

    const handleEdit = (personal: PersonalItem) => {
        setEditingPersonal(personal)
        setIsEditOpen(true)
    }

    const handleAdd = () => {
        setEditingPersonal(null)
        setIsEditOpen(true)
    }

    const handleDeleteClick = (personal: PersonalItem) => {
        setDeletingPersonal(personal)
        setIsDeleteOpen(true)
    }

    const handleToggleStatus = (personal: PersonalItem) => {
        setPersonalToToggle(personal)
        setIsStatusConfirmOpen(true)
    }

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
        } catch (error) {
            toast.error(t('messages.errorGeneric'))
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async (values: PersonalFormValues) => {
        setIsLoading(true)
        try {
            const payload = {
                personal_id: editingPersonal?.personal_id || '',
                personal_firstname: values.personal_firstname,
                personal_lastname: values.personal_lastname,
                personal_username: values.personal_username,
                personal_password: values.personal_password || '', // Send null if empty string
                cmb_role: values.roles_id,
                actionData: editingPersonal ? "EDIT" : "ADD" as "EDIT" | "ADD", // Cast to literal type
            }

            const result = await savePersonal(payload)

            if (result && result.result) {
                toast.success(editingPersonal ? t('messages.successUpdate') : t('messages.successAdd'))
                setIsEditOpen(false)
                router.refresh()
            } else {
                toast.error(result?.message || t('messages.errorSave'))
            }
        } catch (error) {
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
        } catch (error) {
            toast.error(t('messages.errorGeneric'))
        } finally {
            setIsLoading(false)
        }
    }

    const columns = React.useMemo(
        () =>
            getColumns({
                onEdit: handleEdit,
                onDelete: handleDeleteClick,
                onToggleStatus: handleToggleStatus,
            }, t),
        [t]
    )

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center w-full">
                <div className="relative w-full md:w-[400px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('searchPlaceholder')}
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="pl-9 h-12 rounded-xl bg-white border-gray-200 shadow-sm"
                    />
                </div>
                <Button onClick={handleAdd}>
                    <Plus className="mr-2 h-4 w-4" /> {t('addUser')}
                </Button>
            </div>

            <div className="flex-1">
                <DataTable columns={columns} data={filteredData} loading={isLoading} />
            </div>

            {/* Edit/Add Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
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
                        <AlertDialogCancel disabled={isLoading}>{t('form.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleDeleteConfirm()
                            }}
                            disabled={isLoading}
                            className="bg-red-600 focus:ring-red-600"
                        >
                            {isLoading ? t('form.deleting') : t('table.delete')}
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
                        <AlertDialogCancel disabled={isLoading}>{t('form.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
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
