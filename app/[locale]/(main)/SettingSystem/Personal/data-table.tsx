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
    // Using "StreetLight" for "rowsPerPage", "totalDevice", etc. usually works if they are generic, 
    // but Personal page has "Personal" namespace.
    // Let's check Personal namespace again.
    // Personal.table.rowsSelected exist. Personal.table.noResults exist.
    // StreetLight has "totalDevice", "rowsPerPage", "loading".
    // I should probably map these to "Personal" or use "StreetLight" keys if they are global?
    // User wants "Style" to be same. Text might differ.
    // Personal namespace doesn't have "loading", "rowsPerPage".
    // I will use "StreetLight" namespace for generic table controls for now to strictly match the request,
    // OR BETTER: I'll use "Personal" and add missing keys if needed, OR just hardcode/use existing generic keys.
    // Re-reading messages/th.json...
    // Personal has: table.noResults, table.previous, table.next.
    // StreetLight has: rowsPerPage, totalDevice, loading.

    // I will use "StreetLight" for the table common parts to ensure it looks EXACTLY the same, 
    // assuming the keys are available globally or I can access them. 
    // Wait, useTranslations("StreetLight") works in this component regardless of where it's used.

    // However, "totalDevice" says "Total Device". Personal is "Total Users"?
    // "Personal" namespace doesn't have "totalUsers".
    // I will change "totalDevice" to "total" if possible or just use "StreetLight" t function for layout purposes 
    // but using Personal counts.

    const tSL = useTranslations("StreetLight")
    const tPersonal = useTranslations("Personal")

    const [pagination, setPagination] = React.useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
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
                {/* Total Count: Adapted to match style but maybe different text? */}
                {/* StreetLight: {t("totalDevice")} {count} */}
                {/* Let's try to find a generic "Total" or just say "Total Users" */}
                <div>{tPersonal("title")} {table.getFilteredRowModel().rows.length}</div>
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">{tSL("rowsPerPage")}</p>
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
                            {[10, 20, 30, 40, 50].map((pageSize) => (
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
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>{tSL("loading")}</span>
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
                                            <TableCell key={cell.id} className="py-3">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                                {/* Render empty rows to keep table height consistent */}
                                {Array.from({ length: pagination.pageSize - table.getRowModel().rows.length }).map((_, i) => (
                                    <TableRow key={`empty-${i}`} className="pointer-events-none">
                                        <TableCell colSpan={columns.length} className="h-[61px] py-3">
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
                                        {tPersonal("table.noResults")}
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
