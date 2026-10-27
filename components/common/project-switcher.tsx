"use client"

import * as React from "react"
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Search,
    Folders
} from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { switchProject } from "@/app/actions/project"
import { resolveProjectUuid } from "@/config/projects"

export interface ProjectOption {
    id: string
    code?: string
    name: string
}

interface ProjectSwitcherProps {
    currentProjectId: string
    projects: ProjectOption[]
}

export const ProjectSwitcher = ({
    currentProjectId,
    projects,
}: ProjectSwitcherProps) => {
    const [open, setOpen] = React.useState(false)
    const [isPending, startTransition] = React.useTransition()
    const [selectedTarget, setSelectedTarget] = React.useState<string | null>(null)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [currentPage, setCurrentPage] = React.useState(1)
    const [pageSize, setPageSize] = React.useState(10)
    const t = useTranslations("ProjectSwitcher")

    const getProjectCode = React.useCallback((p: ProjectOption) => {
        return p.code || p.id
    }, [])

    const filteredProjects = React.useMemo(() => {
        if (!searchTerm.trim()) return projects
        const term = searchTerm.toLowerCase().trim()
        return projects.filter((p) => {
            const code = getProjectCode(p).toLowerCase()
            return (
                code.includes(term) ||
                p.id.toLowerCase().includes(term) ||
                p.name.toLowerCase().includes(term)
            )
        })
    }, [projects, searchTerm, getProjectCode])

    const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize))
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)

    const paginatedProjects = React.useMemo(() => {
        const start = (safeCurrentPage - 1) * pageSize
        return filteredProjects.slice(start, start + pageSize)
    }, [filteredProjects, safeCurrentPage, pageSize])

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
            setSearchTerm("")
            setCurrentPage(1)
        }
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
        setCurrentPage(1)
    }

    const handlePageSizeChange = (val: string) => {
        setPageSize(Number(val))
        setCurrentPage(1)
    }

    const isCurrentProject = React.useCallback((p: ProjectOption) => {
        const code = p.code || p.id
        if (code.toLowerCase() === currentProjectId.toLowerCase()) return true
        if (p.id.toLowerCase() === currentProjectId.toLowerCase()) return true
        try {
            return resolveProjectUuid(p.id).toLowerCase() === resolveProjectUuid(currentProjectId).toLowerCase()
        } catch {
            return false
        }
    }, [currentProjectId])

    const handleSelect = (projectIdentifier: string) => {
        const isCurrent = projects.some((p) => (p.id === projectIdentifier || p.code === projectIdentifier) && isCurrentProject(p))
        if (isCurrent) {
            setOpen(false)
            return
        }

        setSelectedTarget(projectIdentifier)
        startTransition(async () => {
            const currentPath = typeof window !== "undefined" ? window.location.pathname : "/"
            const res = await switchProject(projectIdentifier, currentPath)
            if (res.success) {
                toast.success(t("switchSuccess"))
                setOpen(false)
                if (res.targetUrl) {
                    window.location.href = res.targetUrl
                } else {
                    window.location.reload()
                }
            } else {
                toast.error(res.error || "Failed to switch project")
                setSelectedTarget(null)
            }
        })
    }

    if (projects.length <= 1) {
        return null
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    className="cursor-pointer relative"
                    variant="ghost"
                    size="icon"
                    aria-label={t("buttonLabel")}
                >
                    <Folders className="h-[1.2rem] w-[1.2rem] transition-transform duration-200 hover:scale-110" />
                    <span className="sr-only">{t("buttonLabel")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        {t("title")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("description")}
                    </DialogDescription>
                </DialogHeader>

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        placeholder={t("searchPlaceholder")}
                        className="pl-9 text-sm"
                    />
                </div>

                {/* Top Controls: Total Count & Rows per page */}
                <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                    <div>{t("totalProjects")} {filteredProjects.length}</div>
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">{t("rowsPerPage")}</p>
                        <Select
                            value={`${pageSize}`}
                            onValueChange={handlePageSizeChange}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue placeholder={pageSize} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 30, 40, 50].map((size) => (
                                    <SelectItem key={size} value={`${size}`}>
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[140px]">{t("colId")}</TableHead>
                                <TableHead>{t("colName")}</TableHead>
                                <TableHead className="w-[110px] text-center">{t("colStatus")}</TableHead>
                                <TableHead className="w-[90px] text-right">{t("colAction")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedProjects.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="h-24 text-center text-sm text-muted-foreground"
                                    >
                                        {t("noProjectsFound")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedProjects.map((project) => {
                                    const isCurrent = isCurrentProject(project)
                                    const isSelectedProcessing = isPending && (selectedTarget === project.id || selectedTarget === project.code)

                                    return (
                                        <TableRow
                                            key={project.id}
                                            className={isCurrent ? "bg-muted/40 font-medium" : undefined}
                                        >
                                            <TableCell className="font-mono text-xs font-semibold text-foreground">
                                                {getProjectCode(project)}
                                            </TableCell>
                                            <TableCell className="text-sm text-foreground">
                                                {project.name}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {isCurrent ? (
                                                    <Badge
                                                        variant="default"
                                                        className="gap-1 text-xs bg-primary text-primary-foreground select-none"
                                                    >
                                                        <Check className="h-3 w-3" />
                                                        {t("active")}
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs text-muted-foreground select-none"
                                                    >
                                                        {t("available")}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {isCurrent ? (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        disabled
                                                        className="text-xs text-muted-foreground cursor-default"
                                                    >
                                                        {t("selected")}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={isPending}
                                                        onClick={() => handleSelect(project.code || project.id)}
                                                        className="cursor-pointer text-xs"
                                                    >
                                                        {isSelectedProcessing ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            t("select")
                                                        )}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center space-x-2 py-2">
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0 cursor-pointer"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safeCurrentPage <= 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1">
                        {(() => {
                            const pageCount = totalPages;
                            const current = safeCurrentPage - 1;
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
                                                onClick={() => setCurrentPage(1)}
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
                                            onClick={() => setCurrentPage(p + 1)}
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
                                                onClick={() => setCurrentPage(pageCount)}
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
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safeCurrentPage >= totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
