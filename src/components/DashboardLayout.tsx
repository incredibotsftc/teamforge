"use client"

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { useAppData } from '@/components/AppDataProvider'
import { formatSeasonDisplay } from '@/hooks/useCurrentSeason'
import { useSidebarToggle } from '@/hooks/use-sidebar-toggle'
import {
  Home,
  BookOpen,
  FolderKanban,
  Calendar,
  DollarSign,
  Users,
  Settings,
  LogOut,
  UsersRound,
  ClipboardList,
  Shield,
  FileQuestion
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
  pageTitle?: string
  pageIcon?: React.ComponentType<{ size?: number; className?: string }>
  actions?: React.ReactNode
  leftActions?: React.ReactNode
  disableContentScroll?: boolean
}

const navigationItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
]

const coreModules = [
  { icon: BookOpen, label: 'Team Notebook', href: '/notebook' },
  { icon: Calendar, label: 'Team Calendar', href: '/calendar' },
  { icon: FolderKanban, label: 'Tasks', href: '/tasks' },
  { icon: DollarSign, label: 'Budget & Sponsors', href: '/budget' },
  { icon: Users, label: 'Mentoring', href: '/mentoring' },
  { icon: ClipboardList, label: 'Scouting', href: '/scouting' },
  { icon: FileQuestion, label: 'Surveys', href: '/surveys' },
]

// Inner component that uses the sidebar context
function DashboardLayoutContent({
  children,
  pageTitle,
  PageIcon,
  actions,
  leftActions,
  disableContentScroll,
}: {
  children: React.ReactNode
  pageTitle: string
  PageIcon: React.ComponentType<{ size?: number; className?: string }>
  actions?: React.ReactNode
  leftActions?: React.ReactNode
  disableContentScroll: boolean
}) {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const { team, teamMembers, currentSeason } = useAppData()
  const shouldShowToggle = useSidebarToggle()
  const { state } = useSidebar()

  const seasonDisplay = formatSeasonDisplay(currentSeason)

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="flex h-full w-full bg-background">
      <Sidebar
        variant="inset"
        collapsible={shouldShowToggle ? "icon" : "none"}
      >
          <SidebarHeader>
            <div className="flex flex-col gap-2 md:gap-4">
              {/* App Logo and Name */}
              <div className={`flex items-center gap-2 md:gap-3 px-2 py-1 md:py-2 ${state === "collapsed" ? "justify-center" : ""}`}>
                <div className={`relative ${state === "collapsed" ? "w-6 h-6" : "w-6 h-6 md:w-8 md:h-8"}`}>
                  <Image
                    src="/logo.png"
                    alt="FTC TeamForge Logo"
                    width={state === "collapsed" ? 24 : 32}
                    height={state === "collapsed" ? 24 : 32}
                    className="rounded"
                  />
                </div>
                {state === "expanded" && (
                  <div className="flex flex-col">
                    <h2 className="text-base md:text-lg font-semibold">FTC TeamForge</h2>
                  </div>
                )}
              </div>

              {/* Team Information */}
              <div className={`flex items-center justify-between border-t pt-2 md:pt-3 ${state === "collapsed" ? "justify-center" : ""}`}>
                <div className={`flex items-center gap-2 md:gap-3 ${state === "collapsed" ? "flex-col gap-2" : ""}`}>
                  {/* Team Logo */}
                  <Avatar className={state === "collapsed" ? "w-8 h-8" : "w-8 h-8 md:w-10 md:h-10"}>
                    {team?.logo_url ? (
                      <AvatarImage src={team.logo_url} alt={`${team.team_name} logo`} />
                    ) : (
                      <AvatarFallback className={state === "collapsed" ? "text-xs font-semibold" : "text-xs md:text-sm font-semibold"}>
                        {team?.team_number?.toString() || '?'}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  {state === "expanded" && (
                    <div className="flex flex-col">
                      <h1 className="text-base md:text-lg font-semibold team-name">
                        {team ? team.team_name : 'Loading...'}
                      </h1>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {team && `#${team.team_number} · `}{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="overflow-y-auto">
            {/* Navigation */}
            <SidebarGroup>
              <SidebarMenu className={state === "collapsed" ? "gap-3" : "gap-0 md:gap-1"}>
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        tooltip={item.label}
                        size="default"
                        className="h-9 text-sm md:h-8 md:text-sm"
                      >
                        <a href={item.href}>
                          <Icon className={state === "collapsed" ? "!w-5 !h-5" : ""} />
                          <span>{item.label}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
                {coreModules.map((item) => {
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        tooltip={item.label}
                        size="default"
                        className="h-9 text-sm md:h-8 md:text-sm"
                      >
                        <a href={item.href}>
                          <Icon className={state === "collapsed" ? "!w-5 !h-5" : ""} />
                          <span>{item.label}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu className={state === "collapsed" ? "gap-3" : "gap-0 md:gap-1"}>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Team and Seasons" asChild className="cursor-pointer h-9 text-sm md:h-8 md:text-sm" isActive={pathname === '/team'} size="default">
                  <a href="/team">
                    <UsersRound className={state === "collapsed" ? "!w-5 !h-5" : ""} />
                    <span>Team and Seasons</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Settings" asChild className="cursor-pointer h-9 text-sm md:h-8 md:text-sm" isActive={pathname === '/settings'} size="default">
                  <a href="/settings">
                    <Settings className={state === "collapsed" ? "!w-5 !h-5" : ""} />
                    <span>Settings</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Legal" asChild className="cursor-pointer h-9 text-sm md:h-8 md:text-sm" isActive={pathname === '/legal'} size="default">
                  <a href="/legal">
                    <Shield className={state === "collapsed" ? "!w-5 !h-5" : ""} />
                    <span>Legal</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Sign Out" onClick={handleSignOut} className="cursor-pointer h-9 text-sm md:h-8 md:text-sm" size="default">
                  <LogOut className={state === "collapsed" ? "!w-5 !h-5" : ""} />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col overflow-hidden">
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
            {shouldShowToggle && <SidebarTrigger className="-ml-1" />}
            <div className="flex flex-1 items-center gap-4">
              {/* Left Actions (e.g., back button) */}
              {leftActions && (
                <div className="flex items-center">
                  {leftActions}
                </div>
              )}

              {/* Page Title with Icon */}
              <div className="flex items-center gap-2">
                <PageIcon size={20} className="text-foreground" />
                <h2 className="text-lg font-semibold">{pageTitle}</h2>
              </div>

              {/* Current Season */}
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <span className="px-2 py-1 bg-muted text-muted-foreground rounded-md font-medium">
                  Current Season
                </span>
                <span>{seasonDisplay}</span>
              </div>
            </div>

            {/* Action Buttons */}
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
          </header>
          <div className={`flex flex-1 flex-col ${disableContentScroll ? 'overflow-hidden' : 'gap-4 p-4 overflow-auto'}`}>
            {children}
          </div>
        </SidebarInset>
      </div>
    )
}

// Main export that wraps with SidebarProvider
export function DashboardLayout({
  children,
  pageTitle = "Dashboard",
  pageIcon: PageIcon = Home,
  actions,
  leftActions,
  disableContentScroll = false
}: DashboardLayoutProps) {
  const [open, setOpen] = useState(true)

  // Collapse sidebar on smaller screens
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth
      // Auto-collapse if screen is smaller than 1280px (xl breakpoint)
      if (width < 1280) {
        setOpen(false)
      } else {
        setOpen(true)
      }
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <DashboardLayoutContent
        pageTitle={pageTitle}
        PageIcon={PageIcon}
        actions={actions}
        leftActions={leftActions}
        disableContentScroll={disableContentScroll}
      >
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  )
}