"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import type { ProjectConfig, ColorPreset } from "@/config/projects/types"
import { SaveProjectPayload, uploadProjectAsset, checkProjectId } from "@/app/actions/project-management"
import { useTranslations } from "next-intl"
import { COLOR_PRESET_BG_CLASSES } from "./columns"
import { cn } from "@/lib/utils"
import { Upload, Loader2, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"

const COLOR_OPTIONS: { value: ColorPreset; label: string }[] = [
    { value: "skyblue", label: "Sky Blue" },
    { value: "blue", label: "Blue" },
    { value: "green", label: "Green" },
    { value: "purple", label: "Purple" },
    { value: "amber", label: "Amber" },
    { value: "rose", label: "Rose" },
    { value: "indigo", label: "Indigo" },
    { value: "emerald", label: "Emerald" },
    { value: "slate", label: "Slate" },
]

const formSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Project Name is required"),
    domain: z.string().min(1, "Domain is required"),
    logo: z.string().min(1, "Logo path is required"),
    appIcon: z.string().min(1, "Favicon icon path is required"),
    color: z.enum(["blue", "green", "purple", "amber", "rose", "indigo", "emerald", "slate", "skyblue"]),
    enableLoginOtp: z.boolean(),
})

export type ProjectFormValues = z.infer<typeof formSchema>

interface ProjectFormProps {
    initialData?: ProjectConfig | null
    onSubmit: (values: SaveProjectPayload) => void
    onCancel: () => void
    isLoading?: boolean
}

export function ProjectForm({
    initialData,
    onSubmit,
    onCancel,
    isLoading,
}: ProjectFormProps) {
    const t = useTranslations("ProjectSettings")

    const form = useForm<ProjectFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            id: initialData?.code || initialData?.id || "",
            name: initialData?.name || "",
            domain: initialData?.domain || "",
            logo: initialData?.logo || "/logo-le-full.svg",
            appIcon: initialData?.appIcon || "/logo-le.svg",
            color: (initialData?.color as ColorPreset) || "skyblue",
            enableLoginOtp: initialData?.enableLoginOtp ?? false,
        },
    })

    const [uploadingField, setUploadingField] = React.useState<"logo" | "appIcon" | null>(null)
    const [logoError, setLogoError] = React.useState(false)
    const [appIconError, setAppIconError] = React.useState(false)
    const logoInputRef = React.useRef<HTMLInputElement>(null)
    const appIconInputRef = React.useRef<HTMLInputElement>(null)

    const processFile = async (file: File, fieldName: "logo" | "appIcon") => {
        setUploadingField(fieldName)
        try {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("type", fieldName)

            const res = await uploadProjectAsset(formData)
            if (res.success && res.url) {
                form.setValue(fieldName, res.url, { shouldValidate: true, shouldDirty: true })
                if (fieldName === "logo") setLogoError(false)
                if (fieldName === "appIcon") setAppIconError(false)
                toast.success(t("form.uploadSuccess"))
            } else {
                const reader = new FileReader()
                reader.onload = () => {
                    const dataUrl = reader.result as string
                    form.setValue(fieldName, dataUrl, { shouldValidate: true, shouldDirty: true })
                    if (fieldName === "logo") setLogoError(false)
                    if (fieldName === "appIcon") setAppIconError(false)
                    toast.success(t("form.uploadSuccess"))
                }
                reader.onerror = () => {
                    toast.error(res.message || t("form.uploadError"))
                }
                reader.readAsDataURL(file)
            }
        } catch {
            const reader = new FileReader()
            reader.onload = () => {
                const dataUrl = reader.result as string
                form.setValue(fieldName, dataUrl, { shouldValidate: true, shouldDirty: true })
                if (fieldName === "logo") setLogoError(false)
                if (fieldName === "appIcon") setAppIconError(false)
                toast.success(t("form.uploadSuccess"))
            }
            reader.onerror = () => {
                toast.error(t("form.uploadError"))
            }
            reader.readAsDataURL(file)
        } finally {
            setUploadingField(null)
        }
    }

    const handleFileUpload = (
        e: React.ChangeEvent<HTMLInputElement>,
        fieldName: "logo" | "appIcon"
    ) => {
        const file = e.target.files?.[0]
        if (file) {
            processFile(file, fieldName)
        }
        e.target.value = ""
    }

    const handleFileDrop = (
        e: React.DragEvent<HTMLDivElement>,
        fieldName: "logo" | "appIcon"
    ) => {
        e.preventDefault()
        const file = e.dataTransfer.files?.[0]
        if (file) {
            processFile(file, fieldName)
        }
    }

    React.useEffect(() => {
        if (initialData) {
            form.reset({
                id: initialData.code || initialData.id,
                name: initialData.name,
                domain: initialData.domain,
                logo: initialData.logo || "/logo-le-full.svg",
                appIcon: initialData.appIcon || "/logo-le.svg",
                color: initialData.color || "skyblue",
                enableLoginOtp: initialData.enableLoginOtp ?? false,
            })
        } else {
            form.reset({
                id: "",
                name: "",
                domain: "",
                logo: "/logo-le-full.svg",
                appIcon: "/logo-le.svg",
                color: "skyblue",
                enableLoginOtp: false,
            })
        }
    }, [initialData, form])

    const handleSubmit = async (values: ProjectFormValues) => {
        if (!initialData) {
            const cleanId = values.id?.trim()
            if (!cleanId) {
                form.setError("id", { message: t("form.required") })
                return
            }
            const check = await checkProjectId(cleanId)
            if (check.exists) {
                form.setError("id", { message: t("form.idExists") })
                return
            }
        }
        const enteredCode = values.id?.trim().toLowerCase() || ""
        onSubmit({
            ...values,
            code: initialData?.code || enteredCode || (values.domain ? values.domain.split('.')[0] : ""),
            id: initialData?.id || enteredCode || "",
            actionData: initialData ? "EDIT" : "ADD",
        })
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5 max-h-[calc(85vh-130px)]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-medium">{t("form.name")} <span className="text-destructive">*</span></FormLabel>
                                    <FormControl>
                                        <Input className="h-9 text-xs sm:text-sm shadow-2xs" placeholder={t("form.namePlaceholder")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="domain"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-medium">{t("form.domain")} <span className="text-destructive">*</span></FormLabel>
                                    <FormControl>
                                        <Input className="h-9 text-xs sm:text-sm shadow-2xs" placeholder={t("form.domainPlaceholder")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField
                            control={form.control}
                            name="id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-medium">
                                        {t("form.id")} {!initialData && <span className="text-destructive">*</span>}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t("form.idPlaceholder")}
                                            {...field}
                                            value={field.value || ""}
                                            disabled={Boolean(initialData)}
                                            className={cn(
                                                "h-9 text-xs sm:text-sm shadow-2xs",
                                                initialData && "bg-muted cursor-not-allowed text-muted-foreground"
                                            )}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="color"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-medium">{t("form.color")} <span className="text-destructive">*</span></FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="w-full h-9 text-xs sm:text-sm cursor-pointer shadow-2xs">
                                                <SelectValue placeholder={t("form.selectColor")} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {COLOR_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value} className="cursor-pointer text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={cn(
                                                                "h-3.5 w-3.5 rounded-full border border-border shadow-2xs",
                                                                COLOR_PRESET_BG_CLASSES[opt.value]
                                                            )}
                                                        />
                                                        <span>{opt.label}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField
                            control={form.control}
                            name="logo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-medium">
                                        {t("form.logo")} <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <div
                                            className="border border-dashed border-border/80 rounded-lg p-3 bg-muted/20 hover:bg-muted/30 transition-colors flex flex-col items-center justify-between min-h-[142px] text-center"
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => handleFileDrop(e, "logo")}
                                        >
                                            <input
                                                ref={logoInputRef}
                                                type="file"
                                                accept=".png,.jpg,.jpeg,.svg,.webp,.ico"
                                                className="hidden"
                                                onChange={(e) => handleFileUpload(e, "logo")}
                                                disabled={uploadingField === "logo" || isLoading}
                                            />
                                            <div className="flex-1 flex flex-col items-center justify-center py-1.5 w-full">
                                                {field.value ? (
                                                    <div className="w-full flex flex-col items-center">
                                                        <div className="h-12 w-full flex items-center justify-center p-1 bg-background/50 rounded border border-border/40">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={field.value}
                                                                alt="Logo Preview"
                                                                className={cn("max-h-10 max-w-full object-contain", logoError && "hidden")}
                                                                onError={() => setLogoError(true)}
                                                                onLoad={() => setLogoError(false)}
                                                            />
                                                            {logoError && (
                                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                    <ImageIcon className="h-4 w-4 opacity-50" />
                                                                    <span className="truncate max-w-[180px]">{field.value}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] text-muted-foreground truncate max-w-[210px] mt-1.5 font-mono">
                                                            {field.value}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center text-muted-foreground py-2">
                                                        <ImageIcon className="h-8 w-8 stroke-[1.5] mb-1 opacity-50" />
                                                        <span className="text-xs">{t("form.dragOrClick")}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-full pt-2 border-t border-border/40">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full h-8 text-xs cursor-pointer shadow-2xs"
                                                    onClick={() => logoInputRef.current?.click()}
                                                    disabled={uploadingField === "logo" || isLoading}
                                                >
                                                    {uploadingField === "logo" ? (
                                                        <>
                                                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                                            {t("form.uploading")}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="h-3.5 w-3.5 mr-1.5" />
                                                            {field.value ? t("form.changeImage") : t("form.uploadButton")}
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="appIcon"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-medium">
                                        {t("form.appIcon")} <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <div
                                            className="border border-dashed border-border/80 rounded-lg p-3 bg-muted/20 hover:bg-muted/30 transition-colors flex flex-col items-center justify-between min-h-[142px] text-center"
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => handleFileDrop(e, "appIcon")}
                                        >
                                            <input
                                                ref={appIconInputRef}
                                                type="file"
                                                accept=".png,.jpg,.jpeg,.svg,.webp,.ico"
                                                className="hidden"
                                                onChange={(e) => handleFileUpload(e, "appIcon")}
                                                disabled={uploadingField === "appIcon" || isLoading}
                                            />
                                            <div className="flex-1 flex flex-col items-center justify-center py-1.5 w-full">
                                                {field.value ? (
                                                    <div className="w-full flex flex-col items-center">
                                                        <div className="h-12 w-full flex items-center justify-center p-1 bg-background/50 rounded border border-border/40">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={field.value}
                                                                alt="Favicon Preview"
                                                                className={cn("h-7 w-7 object-contain", appIconError && "hidden")}
                                                                onError={() => setAppIconError(true)}
                                                                onLoad={() => setAppIconError(false)}
                                                            />
                                                            {appIconError && (
                                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                    <ImageIcon className="h-4 w-4 opacity-50" />
                                                                    <span className="truncate max-w-[180px]">{field.value}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] text-muted-foreground truncate max-w-[210px] mt-1.5 font-mono">
                                                            {field.value}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center text-muted-foreground py-2">
                                                        <ImageIcon className="h-8 w-8 stroke-[1.5] mb-1 opacity-50" />
                                                        <span className="text-xs">{t("form.dragOrClick")}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-full pt-2 border-t border-border/40">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full h-8 text-xs cursor-pointer shadow-2xs"
                                                    onClick={() => appIconInputRef.current?.click()}
                                                    disabled={uploadingField === "appIcon" || isLoading}
                                                >
                                                    {uploadingField === "appIcon" ? (
                                                        <>
                                                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                                            {t("form.uploading")}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="h-3.5 w-3.5 mr-1.5" />
                                                            {field.value ? t("form.changeImage") : t("form.uploadButton")}
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="enableLoginOtp"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/80 p-3 bg-muted/20 shadow-2xs">
                                <div className="space-y-0.5 pr-4">
                                    <FormLabel className="text-xs font-medium cursor-pointer">
                                        {t("form.enableLoginOtp")}
                                    </FormLabel>
                                    <FormDescription className="text-xs text-muted-foreground">
                                        {t("form.enableLoginOtpDesc")}
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={isLoading}
                                        className="cursor-pointer"
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
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
                        {t("form.cancel")}
                    </Button>
                    <Button
                        type="submit"
                        size="sm"
                        disabled={isLoading}
                        className="cursor-pointer h-9 px-4 text-xs font-medium shadow-2xs"
                    >
                        {isLoading ? t("form.saving") : t("form.save")}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
