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
import { ChevronLeft, ChevronRight, Loader2, Inbox } from "lucide-react"
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
    const t = useTranslations("ScheduleSettings")
    const [pagination, setPagination] = React.useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    })

    const [sorting, setSorting] = React.useState<SortingState>([])

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        getRowId: (row) => {
            const item = row as { groupCode?: string; scheduleName?: string }
            return item?.groupCode || item?.scheduleName || ""
        },
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
        <div className="flex flex-1 flex-col justify-between gap-3 h-full">
            {/* Table Card */}
            <div className="rounded-lg border bg-card text-card-foreground shadow-2xs overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/40">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead
                                            key={header.id}
                                            className={cn(
                                                "h-10 px-3 text-sm font-semibold text-muted-foreground text-center",
                                                header.column.id === "scheduleName" && "text-left"
                                            )}
                                        >
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
                                <TableCell colSpan={columns.length} className="h-32 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                        <span>{t("loading")}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="hover:bg-muted/40 transition-colors"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className={cn("py-2.5 px-3 text-sm text-center", cell.column.id === "scheduleName" && "text-left")}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-36 text-center text-muted-foreground"
                                >
                                    <div className="flex flex-col items-center justify-center gap-1.5 py-6">
                                        <Inbox className="h-7 w-7 text-muted-foreground/40" />
                                        <p className="text-sm font-medium">{t("noData")}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Section (Always pinned to bottom) */}
            <div className="mt-auto flex flex-col sm:flex-row items-center justify-between gap-4 px-1 py-2 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-4">
                    <span>
                        {t("totalItems")} {table.getFilteredRowModel().rows.length}
                    </span>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{t("rowsPerPage")}</span>
                        <Select
                            value={`${table.getState().pagination.pageSize}`}
                            onValueChange={(value) => {
                                table.setPageSize(Number(value))
                            }}
                        >
                            <SelectTrigger className="h-8 w-[70px] cursor-pointer">
                                <SelectValue placeholder={table.getState().pagination.pageSize} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 30, 40, 50].map((pageSize) => (
                                    <SelectItem key={pageSize} value={`${pageSize}`} className="cursor-pointer">
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center space-x-2">
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
        </div>
    )
}
