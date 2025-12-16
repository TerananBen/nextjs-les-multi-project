"use client"

import * as React from "react"
import {
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import {
    IconChevronLeft,
    IconChevronRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconPlus,
    IconSearch,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})
    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 10,
    })

    // Modal State
    const [isEditOpen, setIsEditOpen] = React.useState(false)
    const [editingPersonal, setEditingPersonal] = React.useState<PersonalItem | null>(null)
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
    const [deletingPersonal, setDeletingPersonal] = React.useState<PersonalItem | null>(null)
    const [isLoading, setIsLoading] = React.useState(false)

    // Update local data when initialData changes (e.g. after router.refresh)
    React.useEffect(() => {
        setData(initialData)
    }, [initialData])

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

    const handleToggleStatus = async (personal: PersonalItem) => {
        const newStatus = personal.usable === "Y" ? "N" : "Y"
        const result = await setPersonalUsable(personal.personal_id, newStatus)

        if (result && result.result) {
            toast.success(newStatus === "Y" ? t('messages.successEnable') : t('messages.successDisable'))
            router.refresh()
        } else {
            toast.error(t('messages.errorStatus'))
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
                cmb_role: editingPersonal?.roles_id || values.roles_id,
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

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: setPagination,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            pagination,
        },
    })

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] gap-4 w-full">
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('searchPlaceholder')}
                            value={(table.getColumn("fullName")?.getFilterValue() as string) ?? ""}
                            onChange={(event) =>
                                table.getColumn("fullName")?.setFilterValue(event.target.value)
                            }
                            className="pl-8 max-w-sm"
                        />
                    </div>
                </div>
                <Button onClick={handleAdd}>
                    <IconPlus className="mr-2 h-4 w-4" /> {t('addUser')}
                </Button>
            </div>

            <div className="rounded-md border flex-1 relative overflow-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    {t('table.noResults')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-end space-x-2 py-4 shrink-0 mt-auto">
                <div className="flex-1 text-sm text-muted-foreground">
                    {t('table.rowsSelected', {
                        selected: table.getFilteredSelectedRowModel().rows.length,
                        total: table.getFilteredRowModel().rows.length
                    })}
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <IconChevronLeft className="h-4 w-4" />
                        {t('table.previous')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        {t('table.next')}
                        <IconChevronRight className="h-4 w-4" />
                    </Button>
                </div>
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
        </div>
    )
}
