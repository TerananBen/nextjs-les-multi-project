"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Check, Eye, EyeOff, Loader2 } from "lucide-react"
import { updatePersonalProfile, UpdatePersonalProfileParams } from "@/app/actions/personal"
import { cn } from "@/lib/utils"

const createFormSchema = (t: ReturnType<typeof useTranslations>) =>
  z
    .object({
      firstName: z.string().min(1, t("form.firstNameRequired")),
      lastName: z.string().min(1, t("form.lastNameRequired")),
      newPassword: z.string().optional(),
      confirmNewPassword: z.string().optional(),
      currentPassword: z.string().min(1, t("form.currentPasswordRequired")),
    })
    .superRefine((data, ctx) => {
      const newPwd = data.newPassword?.trim() || ""
      const confirmPwd = data.confirmNewPassword?.trim() || ""

      if (confirmPwd.length > 0 && newPwd.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("form.passwordRequiredWhenConfirm"),
          path: ["newPassword"],
        })
        return
      }

      if (newPwd.length > 0) {
        // 1. Min 8 characters
        if (newPwd.length < 8) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("form.passwordMinLength"),
            path: ["newPassword"],
          })
        }
        // 2. Uppercase >= 1
        if (!/[A-Z]/.test(newPwd)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("form.passwordUppercase"),
            path: ["newPassword"],
          })
        }
        // 3. Lowercase >= 1
        if (!/[a-z]/.test(newPwd)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("form.passwordLowercase"),
            path: ["newPassword"],
          })
        }
        // 4. Number >= 1
        if (!/[0-9]/.test(newPwd)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("form.passwordNumber"),
            path: ["newPassword"],
          })
        }
        // 5. Passwords match
        if (newPwd !== confirmPwd) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("form.passwordMismatch"),
            path: ["confirmNewPassword"],
          })
        }
      }
    })

type ProfileFormValues = z.infer<ReturnType<typeof createFormSchema>>

export interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: {
    userId?: string
    firstName?: string
    lastName?: string
    userName?: string
    name?: string
    email?: string
    role?: string
    avatar?: string
  }
}

export function ProfileDialog({ open, onOpenChange, user }: ProfileDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const t = useTranslations("Personal")

  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false)
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  const formSchema = React.useMemo(() => createFormSchema(t), [t])

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      newPassword: "",
      confirmNewPassword: "",
      currentPassword: "",
    },
  })

  const newPasswordValue = form.watch("newPassword") || ""
  const confirmPasswordValue = form.watch("confirmNewPassword") || ""

  const isChangingPassword = newPasswordValue.length > 0 || confirmPasswordValue.length > 0

  const hasMinLength = newPasswordValue.trim().length >= 8
  const hasUppercase = /[A-Z]/.test(newPasswordValue)
  const hasLowercase = /[a-z]/.test(newPasswordValue)
  const hasNumber = /[0-9]/.test(newPasswordValue)
  const isMatched = newPasswordValue.length > 0 && newPasswordValue === confirmPasswordValue

  React.useEffect(() => {
    if (open) {
      form.reset({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        newPassword: "",
        confirmNewPassword: "",
        currentPassword: "",
      })
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
    }
  }, [open, user, form])

  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true)
    try {
      const payload: UpdatePersonalProfileParams = {
        firstname: data.firstName.trim(),
        lastname: data.lastName.trim(),
        password_confirm: data.currentPassword,
        password_new: data.newPassword?.trim() ? data.newPassword.trim() : undefined,
        userId: user?.userId,
      }

      const res = await updatePersonalProfile(payload)
      if (res.result) {
        toast.success(res.message || t("messages.successUpdate"))
        onOpenChange(false)
        if (res.requireRelogin) {
          toast.info(t("form.reloginWarning"))
          setTimeout(() => {
            window.location.href = "/api/auth/logout"
          }, 1000)
        } else {
          router.refresh()
        }
      } else {
        toast.error(res.message || t("messages.errorSave"))
        if (res.message) {
          if (res.message.includes("รหัสผ่านปัจจุบัน")) {
            form.setError("currentPassword", { message: res.message })
          } else if (
            res.message.toLowerCase().includes("blacklist") ||
            res.message.includes("รหัสผ่านใหม่") ||
            res.message.includes("รหัสผ่านนี้อยู่ในรายการ") ||
            res.message.includes("ไม่ปลอดภัย")
          ) {
            form.setError("newPassword", { message: res.message })
          }
        }
      }
    } catch (error) {
      console.error("Profile update failed:", error)
      toast.error(t("messages.errorGeneric"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/40 shrink-0">
          <DialogTitle>{t("form.profileHeader")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1 max-h-[calc(85vh-130px)]">
              {/* 1. First Name & 2. Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("form.firstName")} <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("form.firstName")}
                          {...field}
                          disabled={isLoading}
                          className="h-9 text-sm"
                        />
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
                      <FormLabel>
                        {t("form.lastName")} <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("form.lastName")}
                          {...field}
                          disabled={isLoading}
                          className="h-9 text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 3. New Password */}
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 flex-wrap">
                      <span>{t("form.newPassword")}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {t("form.passwordHint")}
                      </span>
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder={t("form.passwordPlaceholder")}
                          {...field}
                          disabled={isLoading}
                          className="h-9 pr-10 text-sm"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        disabled={isLoading}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 4. Confirm New Password */}
              <FormField
                control={form.control}
                name="confirmNewPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.confirmNewPassword")}</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder={t("form.confirmNewPassword")}
                          {...field}
                          disabled={isLoading}
                          className="h-9 pr-10 text-sm"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password Policy Card (login-update-password.ftl) */}
              <div className="password-policy-card">
                <ul className="policy-list">
                  <li className={cn("policy-item", isChangingPassword && hasMinLength && "valid")}>
                    <span className="policy-icon">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="rule-label">{t("form.policyMinLength")}</span>
                  </li>
                  <li className={cn("policy-item", isChangingPassword && hasUppercase && "valid")}>
                    <span className="policy-icon">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="rule-label">{t("form.policyUppercase")}</span>
                  </li>
                  <li className={cn("policy-item", isChangingPassword && hasLowercase && "valid")}>
                    <span className="policy-icon">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="rule-label">{t("form.policyLowercase")}</span>
                  </li>
                  <li className={cn("policy-item", isChangingPassword && hasNumber && "valid")}>
                    <span className="policy-icon">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="rule-label">{t("form.policyNumber")}</span>
                  </li>
                  <li className={cn("policy-item", isChangingPassword && isMatched && "valid")}>
                    <span className="policy-icon">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="rule-label">{t("form.policyMatch")}</span>
                  </li>
                </ul>
              </div>

              {/* 5. Current Password */}
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem className="pt-1">
                    <FormLabel>
                      {t("form.currentPassword")} <span className="text-destructive">*</span>
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder={t("form.currentPasswordPlaceholder")}
                          {...field}
                          disabled={isLoading}
                          className="h-9 pr-10 text-sm"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        disabled={isLoading}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Footer Buttons */}
            <div className="border-t border-border/40 bg-muted/20 px-6 py-3 flex items-center justify-end gap-2 shrink-0 rounded-b-lg">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="cursor-pointer h-9 px-4 text-xs shadow-2xs"
              >
                {t("form.cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isLoading}
                className={cn(
                  "cursor-pointer h-9 px-4 text-xs font-medium shadow-2xs",
                  isLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("form.saving")}
                  </span>
                ) : (
                  t("form.save")
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
