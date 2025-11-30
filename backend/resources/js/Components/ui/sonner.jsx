import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
            theme="light"
            className="toaster group"
            position="top-right"
            expand={true}
            richColors={true}
            closeButton={true}
            toastOptions={{
                duration: 4000,
                classNames: {
                    toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:pointer-events-auto",
                    description: "group-[.toast]:text-muted-foreground",
                    actionButton:
                        "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    cancelButton:
                        "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                    closeButton:
                        "group-[.toast]:bg-white group-[.toast]:text-foreground group-[.toast]:border-border hover:group-[.toast]:bg-accent",
                    success:
                        "group-[.toaster]:bg-green-50 group-[.toaster]:text-green-900 group-[.toaster]:border-green-200",
                    error: "group-[.toaster]:bg-red-50 group-[.toaster]:text-red-900 group-[.toaster]:border-red-200",
                    warning:
                        "group-[.toaster]:bg-yellow-50 group-[.toaster]:text-yellow-900 group-[.toaster]:border-yellow-200",
                    info: "group-[.toaster]:bg-blue-50 group-[.toaster]:text-blue-900 group-[.toaster]:border-blue-200",
                },
            }}
            {...props}
        /> 
  );
}

export { Toaster }