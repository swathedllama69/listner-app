import { cn } from "@/lib/utils" // Assumes cn utility from lib/utils.ts
import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { useToast } from "./use-toast"
import { X } from "lucide-react"

// NOTE: You must have a base `Toast` component defined in your project
// (e.g., in toast.tsx) which imports these components and applies the styles.
// For simplicity, we are defining the Toast components directly here.

const toastVariants = (variant: any) => ({
    root: cn(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-lg border p-4 shadow-xl transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-full data-[state=closed]:sm:slide-out-to-bottom-full",
        variant === "default" && "border-slate-200 bg-white text-slate-950",
        variant === "destructive" && "border-red-600 bg-red-600 text-slate-50",
        variant === "success" && "border-emerald-600 bg-emerald-600 text-white"
    ),
    action: "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-transparent px-3 text-sm font-medium transition-colors hover:bg-slate-100",
    description: "text-sm opacity-90",
    title: "text-sm font-semibold",
    viewport: cn("fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]")
})


const Toast = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Root>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & {
        variant?: "default" | "destructive" | "success"
    }
>(({ className, variant = "default", ...props }, ref) => {
    return (
        <ToastPrimitives.Root
            ref={ref}
            className={cn(toastVariants(variant).root, className)}
            {...props}
        />
    )
})
Toast.displayName = ToastPrimitives.Root.displayName


const ToastTitle = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Title>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Title
        ref={ref}
        className={cn(toastVariants({}).title, className)}
        {...props}
    />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Description>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Description
        ref={ref}
        className={cn(toastVariants({}).description, className)}
        {...props}
    />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

const ToastClose = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Close>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Close
        ref={ref}
        className={cn(
            "absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity hover:text-slate-950 focus:opacity-100 focus:outline-none group-hover:opacity-100",
            className
        )}
        toast-close=""
        {...props}
    >
        <X className="h-4 w-4" />
    </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName


export function Toaster() {
    const { toasts } = useToast()

    return (
        <ToastPrimitives.Provider>
            {toasts.map(({ id, title, description, action, ...props }) => (
                <Toast key={id} {...props}>
                    <div className="grid gap-1">
                        {title && <ToastTitle>{title}</ToastTitle>}
                        {description && (
                            <ToastDescription>{description}</ToastDescription>
                        )}
                    </div>
                    {action}
                    <ToastClose />
                </Toast>
            ))}
            <ToastPrimitives.Viewport className={cn(toastVariants({}).viewport)} />
        </ToastPrimitives.Provider>
    )
}