"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg font-sans text-sm",
          description: "group-[.toast]:text-muted-foreground font-sans text-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-sans text-sm",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-sans text-sm",
          error:
            "!bg-red-600 !text-white !border-red-600 font-sans text-sm",
          success:
            "!bg-green-600 !text-white !border-green-600 font-sans text-sm",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
