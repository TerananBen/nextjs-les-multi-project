"use client"

import * as React from "react"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    getPaginationRowModel,
    PaginationState,
    SortingState,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    loading?: boolean
}

export function DataTable<TData, TValue>({
    columns,
    data,
    loading = false,
}: DataTableProps<TData, TValue>) {
    const t = useTranslations("MaintenanceDashboard")
    const [pagination, setPagination] = React.useState<PaginationState>({
        pageIndex: 0,
        pageSize: 6,
    })

    const [sorting, setSorting] = React.useState<SortingState>([])

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        state: {
            pagination,
            sorting,
        },
    })

    return (
        <div className="space-y-4">
            {/* Top Controls: Total Count & Rows per page */}
            <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                <div>{t("totalItems")} {table.getFilteredRowModel().rows.length}</div>
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">{t("rowsPerPage")}</p>
                    <Select
                        value={`${table.getState().pagination.pageSize}`}
                        onValueChange={(value) => {
                            table.setPageSize(Number(value))
                        }}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={table.getState().pagination.pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[6, 20, 30, 40, 50].map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`}>
                                    {pageSize}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="mt-4 rounded-xl border bg-card text-card-foreground shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className={cn("text-center",
                                            header.column.id === "index" && "text-left",
                                            header.column.id === "name_operator" && "text-left",
                                            header.column.id === "name_admin" && "text-left"
                                        )}>
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
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>{t("loading")}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            <>
                                {table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className="hover:bg-muted/50"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className={cn("py-3 text-center",
                                                cell.column.id === "index" && "text-left",
                                                cell.column.id === "name_operator" && "text-left",
                                                cell.column.id === "name_admin" && "text-left"
                                            )}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                                {/* Render empty rows to keep table height consistent */}
                                {Array.from({ length: pagination.pageSize - table.getRowModel().rows.length }).map((_, i) => (
                                    <TableRow key={`empty-${i}`} className="pointer-events-none">
                                        <TableCell colSpan={columns.length} className="h-[57px] py-3">
                                            &nbsp;
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </>
                        ) : (
                            <>
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center"
                                    >
                                        {t("noData")}
                                    </TableCell>
                                </TableRow>
                                {/* Render empty rows for no-data state too */}
                                {Array.from({ length: pagination.pageSize - 1 }).map((_, i) => (
                                    <TableRow key={`empty-${i}`} className="pointer-events-none">
                                        <TableCell colSpan={columns.length} className="h-[45px] p-0">
                                            &nbsp;
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-center space-x-2 py-4">
                <Button
                    variant="outline"
                    className="h-8 w-8 p-0 cursor-pointer"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                    {(() => {
                        const pageCount = table.getPageCount();
                        const current = pagination.pageIndex;
                        const maxVisible = 5;

                        let start = Math.max(0, current - Math.floor(maxVisible / 2));
                        const end = Math.min(pageCount, start + maxVisible);
                        start = Math.max(0, end - maxVisible);

                        const pages: number[] = [];
                        for (let i = start; i < end; i++) pages.push(i);

                        return (
                            <>
                                {start > 0 && (
                                    <>
                                        <Button
                                            variant="outline"
                                            className="h-8 w-8 p-0 cursor-pointer"
                                            onClick={() => table.setPageIndex(0)}
                                        >
                                            1
                                        </Button>
                                        {start > 1 && <span className="text-muted-foreground">...</span>}
                                    </>
                                )}
                                {pages.map((p) => (
                                    <Button
                                        key={p}
                                        variant={current === p ? "default" : "outline"}
                                        className="h-8 w-8 p-0 cursor-pointer"
                                        onClick={() => table.setPageIndex(p)}
                                    >
                                        {p + 1}
                                    </Button>
                                ))}
                                {end < pageCount && (
                                    <>
                                        {end < pageCount - 1 && <span className="text-muted-foreground">...</span>}
                                        <Button
                                            variant="outline"
                                            className="h-8 w-8 p-0 cursor-pointer"
                                            onClick={() => table.setPageIndex(pageCount - 1)}
                                        >
                                            {pageCount}
                                        </Button>
                                    </>
                                )}
                            </>
                        );
                    })()}
                </div>

                <Button
                    variant="outline"
                    className="h-8 w-8 p-0 cursor-pointer"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
