"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { PersonalItem, RoleItem, checkPersonalUsername } from "@/app/actions/personal"
import { useEffect } from "react"
import { useTranslations } from "next-intl"

const formSchema = z.object({
    personal_firstname: z.string().min(1, "First name is required"),
    personal_lastname: z.string().min(1, "Last name is required"),
    personal_username: z.string().min(1, "Username is required"),
    personal_password: z.string().optional(),
    roles_id: z.string().min(1, "Role is required"),
})

export type PersonalFormValues = z.infer<typeof formSchema>

interface PersonalFormProps {
    initialData?: PersonalItem | null
    roles: RoleItem[]
    onSubmit: (values: PersonalFormValues) => void
    onCancel: () => void
    isLoading?: boolean
}

export function PersonalForm({
    initialData,
    roles,
    onSubmit,
    onCancel,
    isLoading,
}: PersonalFormProps) {
    const t = useTranslations('Personal')
    const form = useForm<PersonalFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            personal_firstname: "",
            personal_lastname: "",
            personal_username: "",
            personal_password: "",
            roles_id: "",
        },
    })

    useEffect(() => {
        if (initialData) {
            form.reset({
                personal_firstname: initialData.first_name,
                personal_lastname: initialData.last_name,
                personal_username: initialData.personal_username,
                personal_password: "", // Password is usually not sent back, or we leave it empty to not change
                roles_id: String(initialData.roles_id),
            })
        } else {
            form.reset({
                personal_firstname: "",
                personal_lastname: "",
                personal_username: "",
                personal_password: "",
                roles_id: "",
            })
        }
    }, [initialData, form])

    const handleSubmit = async (values: PersonalFormValues) => {
        // Check if username is changed or new
        if (!initialData || initialData.personal_username !== values.personal_username) {
            const checkResult = await checkPersonalUsername(values.personal_username)
            // API returns 0 if not in DB (available)
            if (checkResult && checkResult.dataReturn !== '0') {
                form.setError("personal_username", {
                    type: "manual",
                    message: t('form.usernameExists'),
                })
                return
            }
        }
        onSubmit(values)
    }

    // Convert roles array of objects { "1": "Admin" } to flat array for easier mapping
    // The API returns roleList as [ { "1": "Admin" }, { "2": "Management" } ]
    const flattenedRoles = roles.map((roleObj) => {
        const id = Object.keys(roleObj)[0]
        const name = roleObj[id]
        return { id, name }
    })

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="personal_firstname"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('form.firstName')}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t('form.firstName')} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="personal_lastname"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('form.lastName')}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t('form.lastName')} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="personal_username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('form.username')}</FormLabel>
                            <FormControl>
                                <Input placeholder={t('form.username')} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="personal_password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('form.password')} {initialData && t('form.passwordHint')}</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder={t('form.passwordPlaceholder')} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="roles_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('form.role')}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('form.selectRole')} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {flattenedRoles.map((role) => (
                                        <SelectItem key={role.id} value={role.id}>
                                            {role.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" type="button" onClick={onCancel} disabled={isLoading}>
                        {t('form.cancel')}
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? t('form.saving') : t('form.save')}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
