"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useTranslations, useLocale } from "next-intl"

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
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { User as UserIcon, Lock, Save, KeyRound } from "lucide-react"
import { updatePersonalProfile, UpdatePersonalProfileParams } from "@/app/actions/personal"
import { User, logout } from "@/app/actions/auth"

const formSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    username: z.string().min(1, "Username is required"),
    currentPassword: z.string().min(1, "Current password is required to save changes"),
    newPassword: z.string().optional(),
    confirmNewPassword: z.string().optional(),
}).refine((data) => {
    if (data.newPassword && data.newPassword !== data.confirmNewPassword) {
        return false
    }
    return true
}, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
})

type ProfileFormValues = z.infer<typeof formSchema>

interface ProfileFormProps {
    initialData: User
}

export function ProfileForm({ initialData }: ProfileFormProps) {
    const router = useRouter()
    const locale = useLocale()
    const [isLoading, setIsLoading] = React.useState(false)
    const t = useTranslations("Personal") // Reusing Personal translations

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
                password_confirm: data.currentPassword, // Maps to Current Password
            }

            if (data.newPassword) {
                payload.password_new = data.newPassword
            }

            const result = await updatePersonalProfile(payload)

            if (result && result.result && result.dataReturn === true) {
                toast.success(t('messages.successUpdate'))
                await logout()
                router.push(`/${locale}/login`)
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
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>{t('form.profileHeader')}</CardTitle>
                <CardDescription>
                    {t('form.profileDescription')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <Tabs defaultValue="general" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="general" className="flex items-center gap-2">
                                    <UserIcon className="size-4" />
                                    {t('form.generalTab')}
                                </TabsTrigger>
                                <TabsTrigger value="security" className="flex items-center gap-2">
                                    <Lock className="size-4" />
                                    {t('form.securityTab')}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="general" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('form.firstName')}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={t('form.firstName')} {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="lastName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('form.lastName')}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={t('form.lastName')} {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('form.username')}</FormLabel>
                                            <FormControl>
                                                <Input placeholder={t('form.username')} {...field} value={field.value || ''} disabled className="bg-muted" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </TabsContent>

                            <TabsContent value="security" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="newPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">
                                                    <KeyRound className="size-3" />
                                                    {t('form.newPassword') || "New Password"}
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder={t('form.passwordPlaceholder')} {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="confirmNewPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">
                                                    <KeyRound className="size-3" />
                                                    {t('form.confirmNewPassword')}
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder={t('form.passwordPlaceholder')} {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>

                        <div className="pt-4 border-t space-y-4">
                            <FormField
                                control={form.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <Lock className="size-3" />
                                            {t('form.currentPassword')} <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder={t('form.currentPasswordPlaceholder')} {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end">
                                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto flex items-center gap-2">
                                    {isLoading ? (
                                        <>{t('form.saving')}</>
                                    ) : (
                                        <>
                                            <Save className="size-4" />
                                            {t('form.save')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
