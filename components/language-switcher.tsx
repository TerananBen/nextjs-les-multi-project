"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Globe } from "lucide-react";

const languages = [
    { code: "en", label: "English", flag: "/flags/flag-en.svg" },
    { code: "th", label: "ไทย", flag: "/flags/flag-th.svg" },
];

export function LanguageSwitcher() {
    const t = useTranslations("LanguageSwitcher");
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const onSelectChange = (nextLocale: string) => {
        router.replace(pathname, { locale: nextLocale });
    };

    const currentLang = languages.find((l) => l.code === locale);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t("label")}>
                    {currentLang ? (
                        <Image
                            src={currentLang.flag}
                            alt={currentLang.label}
                            width={20}
                            height={15}
                            className="rounded-[2px]"
                        />
                    ) : (
                        <Globe className="h-[1.2rem] w-[1.2rem]" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => onSelectChange(lang.code)}
                        className="gap-2"
                    >
                        <Image
                            src={lang.flag}
                            alt={lang.label}
                            width={20}
                            height={15}
                            className="rounded-[2px]"
                        />
                        <span>{lang.label}</span>
                        {locale === lang.code && (
                            <Check className="ml-auto h-4 w-4" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

