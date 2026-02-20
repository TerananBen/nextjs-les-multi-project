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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
    const [termsOpen, setTermsOpen] = useState(false)
    const [privacyOpen, setPrivacyOpen] = useState(false)
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
                {t("termsText")}{" "}
                <button type="button" onClick={() => setTermsOpen(true)} className="underline underline-offset-4 hover:text-primary">
                    {t("termsLink")}
                </button>{" "}
                {t("and")}{" "}
                <button type="button" onClick={() => setPrivacyOpen(true)} className="underline underline-offset-4 hover:text-primary">
                    {t("privacyLink")}
                </button>.
            </FieldDescription>

            {/* Terms of Service Dialog */}
            <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t("termsTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 text-sm text-muted-foreground">
                        <div>
                            <h4 className="font-semibold text-foreground mb-1">{t("termsContent1Title")}</h4>
                            <p>{t("termsContent1")}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground mb-1">{t("termsContent2Title")}</h4>
                            <p>{t("termsContent2")}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground mb-1">{t("termsContent3Title")}</h4>
                            <p>{t("termsContent3")}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground mb-1">{t("termsContent4Title")}</h4>
                            <p>{t("termsContent4")}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground mb-1">{t("termsContent5Title")}</h4>
                            <p>{t("termsContent5")}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground mb-1">{t("termsContent6Title")}</h4>
                            <p>{t("termsContent6")}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground mb-1">{t("termsContent7Title")}</h4>
                            <p>{t("termsContent7")}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground mb-1">{t("termsContent8Title")}</h4>
                            <p>{t("termsContent8")}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTermsOpen(false)}>{t("dialogClose")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Privacy Policy Dialog */}
            <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t("privacyTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 text-sm text-muted-foreground">
                        <div>
                            <h4 className="font-semibold text-foreground mb-1">{t("privacyContent1Title")}</h4>
                            <p>{t("privacyContent1")}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground mb-1">{t("privacyContent2Title")}</h4>
                            <p>{t("privacyContent2")}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground mb-1">{t("privacyContent3Title")}</h4>
                            <p>{t("privacyContent3")}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground mb-1">{t("privacyContent4Title")}</h4>
                            <p>{t("privacyContent4")}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground mb-1">{t("privacyContent5Title")}</h4>
                            <p>{t("privacyContent5")}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground mb-1">{t("privacyContent6Title")}</h4>
                            <p>{t("privacyContent6")}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground mb-1">{t("privacyContent7Title")}</h4>
                            <p>{t("privacyContent7")}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPrivacyOpen(false)}>{t("dialogClose")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
