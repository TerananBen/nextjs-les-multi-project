"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

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
import { Card } from "@/components/ui/card"
import {
    User as UserIcon,
    Lock,
    Save,
    KeyRound,
    Eye,
    EyeOff,
    ShieldCheck,
    Users,
    AlertCircle,
    Loader2,
} from "lucide-react"
import { updatePersonalProfile, UpdatePersonalProfileParams } from "@/app/actions/personal"
import { User } from "@/app/actions/auth"

const createFormSchema = (t: ReturnType<typeof useTranslations>) =>
    z.object({
        firstName: z.string().min(1, t("form.firstNameRequired")),
        lastName: z.string().min(1, t("form.lastNameRequired")),
        username: z.string().min(1),
        currentPassword: z.string().min(1, t("form.currentPasswordRequired")),
        newPassword: z.string().optional(),
        confirmNewPassword: z.string().optional(),
    }).refine((data) => {
        if (data.newPassword && data.newPassword !== data.confirmNewPassword) {
            return false
        }
        return true
    }, {
        message: t("form.passwordMismatch"),
        path: ["confirmNewPassword"],
    }).refine((data) => {
        if (data.newPassword && data.newPassword.trim().length > 0 && data.newPassword.trim().length < 6) {
            return false
        }
        return true
    }, {
        message: t("form.passwordMinLength"),
        path: ["newPassword"],
    })

type ProfileFormValues = z.infer<ReturnType<typeof createFormSchema>>

interface ProfileFormProps {
    initialData: User
}

export function ProfileForm({ initialData }: ProfileFormProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = React.useState(false)
    const t = useTranslations("Personal")

    // Password visibility toggles
    const [showCurrentPassword, setShowCurrentPassword] = React.useState(false)
    const [showNewPassword, setShowNewPassword] = React.useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

    const formSchema = React.useMemo(() => createFormSchema(t), [t])

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: initialData.firstName || "",
            lastName: initialData.lastName || "",
            username: initialData.userName || "",
            currentPassword: "",
            newPassword: "",
            confirmNewPassword: "",
        },
    })

    async function onSubmit(data: ProfileFormValues) {
        setIsLoading(true)
        try {
            const payload: UpdatePersonalProfileParams = {
                firstname: data.firstName,
                lastname: data.lastName,
                password_confirm: data.currentPassword,
                userId: initialData.userId,
            }

            if (data.newPassword && data.newPassword.trim().length > 0) {
                payload.password_new = data.newPassword.trim()
            }

            const result = await updatePersonalProfile(payload)

            if (result && result.result && result.dataReturn === true) {
                toast.success(t('messages.successUpdate'))
                if (payload.password_new) {
                    toast.dismiss()
                    window.location.href = "/api/auth/logout"
                } else {
                    form.reset({
                        firstName: data.firstName,
                        lastName: data.lastName,
                        username: data.username,
                        currentPassword: "",
                        newPassword: "",
                        confirmNewPassword: "",
                    })
                    router.refresh()
                }
            } else {
                toast.error(result?.message || t('messages.errorSave'))
            }
        } catch {
            toast.error(t('messages.errorGeneric'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-1 flex-col gap-3 w-full max-w-3xl mx-auto">
            {/* Header Toolbar: Standard Compact Container with Save Button (Hidden on Mobile) */}
            <div className="hidden sm:flex items-center justify-between gap-2.5 p-2 rounded-lg border bg-card text-card-foreground shadow-2xs w-full">
                {/* Title & Subtitle */}
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <UserIcon className="h-4 w-4" />
                    </div>
                    <div>
                        <span className="font-semibold text-sm sm:text-base tracking-tight text-foreground">
                            {t('form.profileHeader')}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                            {t('form.profileDescription')}
                        </span>
                    </div>
                </div>

                {/* Primary Save Button (Desktop / Tablet) */}
                <div className="flex items-center justify-end gap-2 shrink-0">
                    <Button
                        size="sm"
                        type="button"
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={isLoading}
                        className="cursor-pointer h-9 px-5 text-xs sm:text-sm font-medium shadow-xs"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                {t('form.saving')}
                            </>
                        ) : (
                            <>
                                <Save className="mr-1.5 h-3.5 w-3.5" />
                                {t('form.save')}
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Form Section Containers */}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 w-full">
                    {/* Card 1: User Identity & Personal Information */}
                    <Card className="rounded-lg border border-border/80 bg-card text-card-foreground shadow-2xs p-4 sm:p-5 w-full space-y-4">
                        {/* Card Header: Section Title */}
                        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                            <UserIcon className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold text-foreground">
                                {t('form.accountDetails')}
                            </span>
                        </div>

                        {/* Row 1: Account Information (Username & Role) - Symmetrical 2-Column Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Username Card */}
                            <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border/80 bg-muted/40 shadow-2xs">
                                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                                    <Users className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-xs font-medium text-muted-foreground block leading-tight">
                                        {t('form.username')}
                                    </span>
                                    <span className="text-sm font-semibold text-foreground truncate block mt-0.5">
                                        @{initialData.userName}
                                    </span>
                                </div>
                            </div>

                            {/* Role Card */}
                            <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border/80 bg-muted/40 shadow-2xs">
                                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                                    <ShieldCheck className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-xs font-medium text-muted-foreground block leading-tight">
                                        {t('form.role')}
                                    </span>
                                    <span className="text-sm font-semibold text-foreground truncate block mt-0.5">
                                        {initialData.userRole || "User"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: First Name & Last Name - 2-Column Grid matching Row 1 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs sm:text-sm font-medium text-muted-foreground">
                                            {t('form.firstName')}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={t('form.firstName')}
                                                {...field}
                                                value={field.value || ''}
                                                className="h-9 text-sm bg-background shadow-none"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs sm:text-sm font-medium text-muted-foreground">
                                            {t('form.lastName')}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={t('form.lastName')}
                                                {...field}
                                                value={field.value || ''}
                                                className="h-9 text-sm bg-background shadow-none"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </Card>

                    {/* Card 2: Security & Password Change */}
                    <Card className="rounded-lg border border-border/80 bg-card text-card-foreground shadow-2xs p-4 sm:p-5 w-full space-y-4">
                        {/* Section Header */}
                        <div className="flex items-center justify-between pb-1 border-b border-border/50">
                            <div className="flex items-center gap-1.5">
                                <Lock className="h-4 w-4 text-amber-500" />
                                <span className="text-sm font-semibold text-foreground">
                                    {t('form.securitySection')}
                                </span>
                            </div>
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                                {t('form.securitySectionDesc')}
                            </span>
                        </div>

                        {/* Re-login notice */}
                        <div className="rounded-md border border-amber-500/25 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>{t('form.reloginWarning')}</span>
                        </div>

                        {/* New Password & Confirm New Password */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FormField
                                control={form.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs sm:text-sm font-medium text-muted-foreground">
                                            {t('form.newPassword')}
                                        </FormLabel>
                                        <div className="relative">
                                            <FormControl>
                                                <Input
                                                    type={showNewPassword ? "text" : "password"}
                                                    placeholder={t('form.passwordPlaceholder')}
                                                    {...field}
                                                    value={field.value || ''}
                                                    className="pr-9 h-9 text-sm bg-background shadow-none"
                                                />
                                            </FormControl>
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                                tabIndex={-1}
                                            >
                                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmNewPassword"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs sm:text-sm font-medium text-muted-foreground">
                                            {t('form.confirmNewPassword')}
                                        </FormLabel>
                                        <div className="relative">
                                            <FormControl>
                                                <Input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    placeholder={t('form.passwordPlaceholder')}
                                                    {...field}
                                                    value={field.value || ''}
                                                    className="pr-9 h-9 text-sm bg-background shadow-none"
                                                />
                                            </FormControl>
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                                tabIndex={-1}
                                            >
                                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Section 3: Current Password (Required to confirm changes) */}
                        <div className="border-t border-border/50 pt-3 space-y-3">
                            <div className="flex items-center gap-1.5 pb-1 border-b border-border/50">
                                <KeyRound className="h-4 w-4 text-emerald-500" />
                                <span className="text-sm font-semibold text-foreground">
                                    {t('form.confirmSection')}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                                <FormField
                                    control={form.control}
                                    name="currentPassword"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel className="text-xs sm:text-sm font-medium text-muted-foreground">
                                                {t('form.currentPassword')} <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <div className="relative">
                                                <FormControl>
                                                    <Input
                                                        type={showCurrentPassword ? "text" : "password"}
                                                        placeholder={t('form.currentPasswordPlaceholder')}
                                                        {...field}
                                                        value={field.value || ''}
                                                        className="pr-9 h-9 text-sm bg-background shadow-none"
                                                    />
                                                </FormControl>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                                    tabIndex={-1}
                                                >
                                                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />

                                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground flex items-center gap-2 mt-auto sm:mt-5">
                                    <KeyRound className="h-4 w-4 text-emerald-500 shrink-0" />
                                    <span>{t('form.profileDescription')}</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Primary Save Button (Mobile Only) */}
                    <div className="block sm:hidden w-full pt-1">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="cursor-pointer h-10 w-full text-sm font-medium shadow-xs"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('form.saving')}
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    {t('form.save')}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    )
}
