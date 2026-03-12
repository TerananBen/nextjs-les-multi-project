"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxContextType {
    value: string
    onValueChange: (value: string) => void
    open: boolean
    setOpen: (open: boolean) => void
    label?: string
}

const ComboboxContext = React.createContext<ComboboxContextType | undefined>(undefined)

// Main Combobox Component
interface ComboboxProps {
    children: React.ReactNode
    value?: string
    onValueChange?: (value: string) => void
    items?: readonly unknown[] // Optional if using custom items
}

export function Combobox({ children, value: controlledValue, onValueChange }: ComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [value, setValue] = React.useState(controlledValue || "")

    const handleValueChange = (newValue: string) => {
        setValue(newValue)
        if (onValueChange) onValueChange(newValue)
        setOpen(false)
    }

    // Sync controlled value
    React.useEffect(() => {
        if (controlledValue !== undefined) {
            setValue(controlledValue)
        }
    }, [controlledValue])

    // Helper to find label if items provided, else simple pass
    // This is a naive implementation to support the context.
    // In a real robust one we might need to register items.
    // For this specific UI request, we just need to share state.

    return (
        <ComboboxContext.Provider value={{ value, onValueChange: handleValueChange, open, setOpen }}>
            <Popover open={open} onOpenChange={setOpen}>
                {children}
            </Popover>
        </ComboboxContext.Provider>
    )
}

// Input / Trigger
// Use 'ComboboxTrigger' or match User's 'ComboboxInput' if it acts as trigger
// User's snippet: <ComboboxInput placeholder="Select a framework" /> 
// This implies the Trigger IS the Input OR there is a Trigger that looks like an input?
// In Shadcn, usually the Trigger is a Button.
// "ComboboxInput" suggests the Trigger has an input? Or just text.
// The snippet shows `ComboboxInput` taking a placeholder.
// Let's assume `ComboboxInput` is the Trigger Button that LOOKS like an input or displays the value.

export function ComboboxInput({ placeholder, className }: { placeholder?: string, className?: string }) {
    const context = React.useContext(ComboboxContext)
    if (!context) throw new Error("ComboboxInput must be used within Combobox")

    return (
        <PopoverTrigger asChild>
            <Button
                variant="outline"
                role="combobox"
                aria-expanded={context.open}
                className={cn("w-full justify-between h-12", className)}
            >
                <span className="truncate">{context.value || placeholder || "Select..."}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
        </PopoverTrigger>
    )
}

export function ComboboxContent({ children, className, searchPlaceholder = "Search..." }: { children: React.ReactNode, className?: string, searchPlaceholder?: string }) {
    return (
        <PopoverContent
            className={cn("p-0", className)}
            style={{ width: "var(--radix-popover-trigger-width)" }}
        >
            <Command>
                <CommandInput placeholder={searchPlaceholder} />
                {children}
            </Command>
        </PopoverContent>
    )
}

export function ComboboxList({ children }: { children: React.ReactNode }) {
    return (
        <CommandList>
            <CommandGroup>
                {children}
            </CommandGroup>
        </CommandList>
    )
}

export function ComboboxEmpty({ children }: { children: React.ReactNode }) {
    return <CommandEmpty>{children}</CommandEmpty>
}

export function ComboboxItem({ value, children, onSelect }: { value: string, children: React.ReactNode, onSelect?: (val: string) => void }) {
    const context = React.useContext(ComboboxContext)

    return (
        <CommandItem
            value={value}
            onSelect={() => {
                // Use original value if possible or currentValue (lowercase)
                // Passing value prop as the 'value' to Select
                if (context?.onValueChange) context.onValueChange(value) // Use exact casing value
                if (onSelect) onSelect(value)
            }}
        >
            <Check
                className={cn(
                    "mr-2 h-4 w-4",
                    context?.value === value ? "opacity-100" : "opacity-0"
                )}
            />
            {children}
        </CommandItem>
    )
}
