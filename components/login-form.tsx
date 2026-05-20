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
import { Alert, AlertTitle } from "@/components/ui/alert"
import {
    Dialog,
    DialogContent,
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
            <Card className="border-none shadow-none bg-transparent sm:bg-card/30 sm:backdrop-blur-md sm:border sm:border-border/40 relative overflow-hidden rounded-2xl">
                {/* Visual Accent Top Bar */}
                <div className="absolute top-0 left-0 right-0 h-[3px] opacity-80" />

                <CardHeader className="text-center pt-8 pb-4">
                    <CardTitle className="text-2xl font-bold tracking-tight text-foreground">{t("welcomeTitle")}</CardTitle>
                    <CardDescription className="text-muted-foreground text-sm">
                        {t("welcomeDescription")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pb-8">
                    <form action={formAction}>
                        <FieldGroup className="gap-5">
                            {state.isLocked && !state.success && (
                                <Alert variant="destructive" className="rounded-xl border border-destructive/20 bg-destructive/10">
                                    <ShieldAlert className="h-4 w-4 text-destructive" />
                                    <AlertTitle className="text-sm font-semibold">{t("accountLocked")}</AlertTitle>
                                </Alert>
                            )}
                            {(state.message || state.errorKey) && !state.success && !state.isLocked && (
                                <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm font-medium text-center flex flex-col gap-1">
                                    <span>{state.errorKey ? t(state.errorKey) : state.message}</span>
                                    {state.failedAttempts && (
                                        <span className="text-xs text-destructive/80 font-normal">
                                            {t("failedAttempts", { count: state.failedAttempts })}
                                        </span>
                                    )}
                                </div>
                            )}
                            <Field className="gap-1.5">
                                <FieldLabel htmlFor="username" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{t("usernameLabel")}</FieldLabel>
                                <Input
                                    id="username"
                                    name="username"
                                    type="text"
                                    placeholder={t("usernamePlaceholder")}
                                    required
                                    className="h-11 rounded-xl bg-muted/20 border-border/40 hover:bg-muted/30 focus:bg-background focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm shadow-sm"
                                />
                            </Field>
                            <Field className="gap-1.5">
                                <div className="flex items-center justify-between">
                                    <FieldLabel htmlFor="password" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{t("passwordLabel")}</FieldLabel>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="pr-10 h-11 rounded-xl bg-muted/20 border-border/40 hover:bg-muted/30 focus:bg-background focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm shadow-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
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
                            <Field className="mt-2">
                                <Button
                                    className="cursor-pointer w-full bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold h-11 rounded-xl transition-all shadow-[0_4px_16px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.35)] active:scale-[0.98] flex items-center justify-center gap-2 border-none"
                                    type="submit"
                                    disabled={isPending || state.isLocked}
                                >
                                    {isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                                    ) : (
                                        t("loginButton")
                                    )}
                                </Button>

                                <FieldDescription className="text-center text-xs text-muted-foreground/80 mt-4">
                                    {"© 2026 Lighting and Equipment PCL"}
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>

            <FieldDescription className="px-6 text-center text-xs text-muted-foreground/90">
                {t("termsText")}{" "}
                <button type="button" onClick={() => setTermsOpen(true)} className="cursor-pointer underline underline-offset-4 font-semibold text-foreground hover:text-primary transition-colors">
                    {t("termsLink")}
                </button>{" "}
                {t("and")}{" "}
                <button type="button" onClick={() => setPrivacyOpen(true)} className="cursor-pointer underline underline-offset-4 font-semibold text-foreground hover:text-primary transition-colors">
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
                        <Button className="cursor-pointer" variant="outline" onClick={() => setTermsOpen(false)}>{t("dialogClose")}</Button>
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
                        <Button className="cursor-pointer" variant="outline" onClick={() => setPrivacyOpen(false)}>{t("dialogClose")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
