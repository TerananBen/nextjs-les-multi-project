"use client"

import { useState, useActionState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { login } from "@/app/actions/auth"

const initialState = {
    success: false,
    message: "",
    failedAttempts: null as string | null,
    errorKey: undefined as string | undefined,
    isLocked: false,
}

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const [showPassword, setShowPassword] = useState(false)
    const t = useTranslations("LoginForm")
    const router = useRouter()
    const [state, formAction, isPending] = useActionState(login, initialState)

    useEffect(() => {
        if (state.success) {
            router.push("/Dashboard/GroupDashboard")
        }
    }, [state.success, router])

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">{t("welcomeTitle")}</CardTitle>
                    <CardDescription>
                        {t("welcomeDescription")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction}>
                        <FieldGroup>
                            {state.isLocked && !state.success && (
                                <Alert variant="destructive">
                                    <ShieldAlert className="h-4 w-4" />
                                    <AlertTitle>{t("accountLocked")}</AlertTitle>
                                </Alert>
                            )}
                            {(state.message || state.errorKey) && !state.success && !state.isLocked && (
                                <div className="text-destructive text-sm font-medium text-center">
                                    {state.errorKey ? t(state.errorKey) : state.message}
                                    {state.failedAttempts && (
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            {t("failedAttempts", { count: state.failedAttempts })}
                                        </div>
                                    )}
                                </div>
                            )}
                            <Field>
                                <FieldLabel htmlFor="username">{t("usernameLabel")}</FieldLabel>
                                <Input
                                    id="username"
                                    name="username"
                                    type="text"
                                    placeholder={t("usernamePlaceholder")}
                                    required
                                />
                            </Field>
                            <Field>
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password">{t("passwordLabel")}</FieldLabel>
                                    <a
                                        href="#"
                                        className="ml-auto text-sm underline-offset-4 hover:underline"
                                    >
                                        {t("forgotPassword")}
                                    </a>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                        <span className="sr-only">
                                            {showPassword ? "Hide password" : "Show password"}
                                        </span>
                                    </button>
                                </div>
                            </Field>
                            <Field>
                                <Button type="submit" disabled={isPending || state.isLocked}>
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t("loginButton")}
                                </Button>
                                <FieldDescription className="text-center">
                                    {t("noAccount")} <a href="#">{t("signUp")}</a>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
            <FieldDescription className="px-6 text-center">
                {t("termsText")} <a href="#">{t("termsLink")}</a>{" "}
                {t("and")} <a href="#">{t("privacyLink")}</a>.
            </FieldDescription>
        </div>
    )
}
