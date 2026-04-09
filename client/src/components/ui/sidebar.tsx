
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { VariantProps, cva } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";

import { useIsMobile } from "./use-mobile";
import { cn } from "./utils";
import { Button } from "./button";
import { Input } from "./input";
import { Separator } from "./separator";
import {
 Sheet,
 SheetContent,
 SheetDescription,
 SheetHeader,
 SheetTitle,
} from "./sheet";
import { Skeleton } from "./skeleton";
import {
 Tooltip,
 TooltipContent,
 TooltipProvider,
 TooltipTrigger,
} from "./tooltip";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextProps = {
 state: "expanded" | "collapsed";
 open: boolean;
 setOpen: (open: boolean) => void;
 openMobile: boolean;
 setOpenMobile: (open: boolean) => void;
 isMobile: boolean;
 toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
 const context = React.useContext(SidebarContext);
 if (!context) {
 throw new Error("useSidebar must be used within a SidebarProvider.");
 }

 return context;
}

function SidebarProvider({
 defaultOpen = true,
 open: openProp,
 onOpenChange: setOpenProp,
 className,
 style,
 children,
 ...props
}: React.ComponentProps<"div"> & {
 defaultOpen?: boolean;
 open?: boolean;
 onOpenChange?: (open: boolean) => void;
}) {
 const isMobile = useIsMobile();
 const [openMobile, setOpenMobile] = React.useState(false);

 // This is the internal state of the sidebar.
 // We use openProp and setOpenProp for control from outside the component.
 const [_open, _setOpen] = React.useState(defaultOpen);
 const open = openProp ?? _open;
 const setOpen = React.useCallback(
 (value: boolean | ((value: boolean) => boolean)) => {
 const openState = typeof value === "function" ? value(open) : value;
 if (setOpenProp) {
 setOpenProp(openState);
 } else {
 _setOpen(openState);
 }

 // This sets the cookie to keep the sidebar state.
 document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
 },
 [setOpenProp, open],
 );

 // Helper to toggle the sidebar.
 const toggleSidebar = React.useCallback(() => {
 return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
 }, [isMobile, setOpen, setOpenMobile]);

 // Adds a keyboard shortcut to toggle the sidebar.
 React.useEffect(() => {
 const handleKeyDown = (event: KeyboardEvent) => {
 if (
 event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
 (event.metaKey || event.ctrlKey)
 ) {
 event.preventDefault();
 toggleSidebar();
 }
 };

 window.addEventListener("keydown", handleKeyDown);
 return () => window.removeEventListener("keydown", handleKeyDown);
 }, [toggleSidebar]);

 return (
 <SidebarContext.Provider
 value={{
 state: open ? "expanded" : "collapsed",
 open,
 setOpen,
 openMobile,
 setOpenMobile,
 isMobile,
 toggleSidebar,
 }}
 >
 <div
 style={style}
 className={cn(
 "flex h-svh w-full has-data-[variant=inset]:bg-background",
 className,
 )}
 {...props}
 >
 {children}
 </div>
 </SidebarContext.Provider>
 );
}

function Sidebar({
 side = "left",
 variant = "sidebar",
 collapsible = "offcanvas",
 className,
 children,
 ...props
}: React.ComponentProps<"div"> & {
 side?: "left" | "right";
 variant?: "sidebar" | "floating" | "inset";
 collapsible?: "offcanvas" | "icon" | "none";
}) {
 const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

 if (collapsible === "none") {
 return (
 <div
 data-slot="sidebar"
 className={cn(
 "bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col",
 className,
 )}
 {...props}
 >
 {children}
 </div>
 );
 }

 if (isMobile) {
 return (
 <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
 <SheetContent
 data-sidebar="sidebar"
 data-slot="sidebar"
 data-mobile="true"
 className="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
 style={
 {
 "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
 } as React.CSSProperties
 }
 side={side}
 >
 <SheetHeader className="sr-only">
 <SheetTitle>Sidebar</SheetTitle>
 <SheetDescription>Displays the mobile sidebar.</SheetDescription>
 </SheetHeader>
 <div className="flex h-full w-full flex-col">{children}</div>
 </SheetContent>
 </Sheet>
 );
 }

 return (
 <div
 className="group peer text-sidebar-foreground hidden md:block"
 data-state={state}
 data-collapsible={state === "collapsed" ? collapsible : ""}
 data-variant={variant}
 data-side={side}
 data-slot="sidebar"
 >
 {/* This is what handles the sidebar gap on desktop */}
 <div
 data-slot="sidebar-gap"
 className={cn(
 "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
 "group-data-[collapsible=offcanvas]:w-0",
 variant === "floating" || variant === "inset"
 ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
 : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
 )}
 />
 <div
 data-slot="sidebar-container"
 className={cn(
 "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[inset-inline-start,inset-inline-end,width] duration-200 ease-linear md:flex",
 side === "left"
 ? "start-0 group-data-[collapsible=offcanvas]:start-[calc(var(--sidebar-width)*-1)]"
 : "end-0 group-data-[collapsible=offcanvas]:end-[calc(var(--sidebar-width)*-1)]",
 // Adjust the padding for floating and inset variants.
 variant === "floating" || variant === "inset"
 ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
 : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-e group-data-[side=right]:border-s",
 className,
 )}
 {...props}
 >
 <div
 data-sidebar="sidebar"
 data-slot="sidebar-inner"
 className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
 >
 {children}
 </div>
 </div>
 </div>
 );
}

function SidebarTrigger({
 className,
 ...props
}: React.ComponentProps<typeof Button>) {
 const { toggleSidebar } = useSidebar();

 return (
 <Button
 variant="ghost"
 size="icon"
 className={cn("h-7 w-7", className)}
 onClick={toggleSidebar}
 {...props}
 >
 <PanelLeftIcon className="h-4 w-4" />
 <span className="sr-only">Toggle Sidebar</span>
 </Button>
 );
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
 const { toggleSidebar } = useSidebar();

 return (
 <button
 data-sidebar="rail"
 aria-label="Toggle Sidebar"
 tabIndex={-1}
 onClick={toggleSidebar}
 className={cn(
 "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] after:-translate-x-1/2 hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
 "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
 "[[data-side=left]_&_svg]:rotate-180",
 className,
 )}
 {...props}
 >
 <svg
 data-sidebar="rail-icon"
 aria-hidden="true"
 width="16"
 height="18"
 viewBox="0 0 16 18"
 fill="none"
 xmlns="http://www.w3.org/2000/svg"
 className="absolute start-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 text-sidebar-border transition-all"
 >
 <rect x="6" y="0" width="4" height="18" fill="currentColor" />
 </svg>
 <button
 data-sidebar="rail-resize"
 className="group/rail absolute start-1/2 top-1/2 hidden h-8 w-1 -translate-x-1/2 -translate-y-1/2 z-50 rounded-full bg-transparent p-0 sm:flex"
 />
 </button>
 );
}

function SidebarInset({
 className,
 ...props
}: React.ComponentProps<"main">) {
 return (
 <main
 className={cn(
 "relative flex min-h-svh flex-1 flex-col bg-background",
 "peer-data-[variant=inset]:min-h-[calc(svh-theme(spacing.4))] md:peer-data-[state=collapsed]:peer-data-[collapsible=icon]:before:absolute md:peer-data-[state=collapsed]:peer-data-[collapsible=icon]:before:inset-y-0 md:peer-data-[state=collapsed]:peer-data-[collapsible=icon]:before:w-(--sidebar-width-icon) md:peer-data-[state=collapsed]:peer-data-[collapsible=icon]:before:bg-sidebar",
 "peer-data-[side=left]:peer-data-[variant=inset]:peer-data-[collapsible=offcanvas]:before:start-0",
 "peer-data-[side=right]:peer-data-[variant=inset]:peer-data-[collapsible=offcanvas]:before:end-0",
 className,
 )}
 {...props}
 />
 );
}

const SidebarMenuButtonVariants = cva(
 "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
 {
 variants: {
 variant: {
 default: "hover:bg-transparent active:bg-transparent",
 outline:
 "border border-sidebar-border bg-white hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground",
 },
 size: {
 default: "h-8 px-2",
 sm: "h-7 px-2 text-xs",
 lg: "h-12 px-4 text-base group-data-[collapsible=icon]:!p-2",
 },
 },
 defaultVariants: {
 variant: "default",
 size: "default",
 },
 },
);

interface SidebarMenuButtonProps
 extends React.ComponentProps<"button">,
 VariantProps<typeof SidebarMenuButtonVariants> {
 asChild?: boolean;
 isActive?: boolean;
 tooltip?: string | React.ComponentProps<typeof Tooltip>;
}

const SidebarMenuButton = React.forwardRef<
 HTMLButtonElement,
 SidebarMenuButtonProps
>(
 (
 {
 asChild = false,
 isActive = false,
 variant = "default",
 size = "default",
 tooltip,
 className,
 ...props
 },
 ref,
 ) => {
 const Comp = asChild ? Slot : "button";
 const { isMobile, state } = useSidebar();

 const button = (
 <Comp
 ref={ref}
 data-sidebar="menu-button"
 data-size={size}
 data-active={isActive}
 className={cn(
 SidebarMenuButtonVariants({ variant, size }),
 className,
 )}
 {...props}
 />
 );

 if (!tooltip) {
 return button;
 }

 if (typeof tooltip === "string") {
 tooltip = {
 children: <p>{tooltip}</p>,
 };
 }

 return (
 <Tooltip>
 <TooltipTrigger asChild>{button}</TooltipTrigger>
 <TooltipContent
 side={isMobile ? "bottom" : state === "collapsed" ? "right" : "bottom"}
 {...tooltip}
 />
 </Tooltip>
 );
 },
);
SidebarMenuButton.displayName = "SidebarMenuButton";

function SidebarMenu({
 className,
 ...props
}: React.ComponentProps<"ul">) {
 return (
 <ul
 data-sidebar="menu"
 className={cn("flex w-full min-w-0 flex-col gap-1", className)}
 {...props}
 />
 );
}

function SidebarMenuItem({
 className,
 ...props
}: React.ComponentProps<"li">) {
 return (
 <li
 data-sidebar="menu-item"
 className={cn("group/menu-item relative", className)}
 {...props}
 />
 );
}

function SidebarMenuSkeleton({
 className,
 ...props
}: React.ComponentProps<"div">) {
 return (
 <div
 data-sidebar="menu-skeleton"
 className={cn("flex flex-col gap-2", className)}
 {...props}
 >
 <Skeleton className="h-8 w-full rounded-md" />
 <Skeleton className="ms-2 h-6 w-[80%] rounded-md" />
 </div>
 );
}

function SidebarMenuSub({
 className,
 ...props
}: React.ComponentProps<"ul">) {
 return (
 <ul
 data-sidebar="menu-sub"
 className={cn(
 "border-sidebar-border group-data-[collapsible=icon]:hidden mx-3.5 flex min-w-0 translate-x-0 flex-col gap-1 border-l px-2.5 py-0.5 transition-[margin,padding] group-data-[side=right]:border-l-0 group-data-[side=right]:border-r group-data-[side=right]:ps-0 group-data-[side=right]:pe-2.5",
 className,
 )}
 {...props}
 />
 );
}

function SidebarMenuSubItem({
 ...props
}: React.ComponentProps<"li">) {
 return <li {...props} />;
}

function SidebarMenuSubButton({
 asChild = false,
 size = "sm",
 isActive,
 className,
 ...props
}: React.ComponentProps<"a"> & {
 asChild?: boolean;
 size?: "sm" | "md";
 isActive?: boolean;
}) {
 const Comp = asChild ? Slot : "a";

 return (
 <Comp
 data-sidebar="menu-sub-button"
 data-size={size}
 data-active={isActive}
 className={cn(
 "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sm outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
 "data-[size=md]:h-8 data-[size=md]:px-2",
 "group-data-[collapsible=icon]:hidden",
 className,
 )}
 {...props}
 />
 );
}

function SidebarMenuAction({
 className,
 asChild = false,
 showOnHover = false,
 ...props
}: React.ComponentProps<"button"> & {
 asChild?: boolean;
 showOnHover?: boolean;
}) {
 const Comp = asChild ? Slot : "button";

 return (
 <Comp
 data-sidebar="menu-action"
 className={cn(
 "absolute top-1/2 -translate-y-1/2 rounded-md p-1 text-sidebar-foreground outline-none ring-sidebar-ring transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
 // Logical positioning for RTL/LTR support
 "group-data-[side=left]:end-1",
 "group-data-[side=right]:start-1",
 showOnHover &&
 "group-data-[side=left]:peer-data-[state=expanded]:group-hover/menu-item:opacity-100 group-data-[side=left]:peer-data-[state=expanded]:group-hover/menu-item:visible group-data-[side=left]:peer-data-[state=expanded]:opacity-0 group-data-[side=left]:peer-data-[state=expanded]:invisible group-data-[side=right]:peer-data-[state=expanded]:group-hover/menu-item:opacity-100 group-data-[side=right]:peer-data-[state=expanded]:group-hover/menu-item:visible group-data-[side=right]:peer-data-[state=expanded]:opacity-0 group-data-[side=right]:peer-data-[state=expanded]:invisible",
 className,
 )}
 {...props}
 />
 );
}

function SidebarMenuBadge({
 className,
 ...props
}: React.ComponentProps<"div">) {
 return (
 <div
 data-sidebar="menu-badge"
 className={cn(
 "pointer-events-none absolute top-1/2 flex h-6 min-w-6 -translate-y-1/2 items-center justify-center rounded-md border border-sidebar-border bg-background px-1 text-xs font-medium text-sidebar-foreground tabular-nums group-data-[side=left]:end-1 group-data-[side=right]:start-1",
 className,
 )}
 {...props}
 />
 );
}

function SidebarMenuSeparator({
 className,
 ...props
}: React.ComponentProps<"hr">) {
 return (
 <hr
 data-sidebar="menu-separator"
 className={cn(
 "mx-2 my-2 border-sidebar-border group-data-[collapsible=icon]:my-2 group-data-[collapsible=icon]:mx-0",
 className,
 )}
 {...props}
 />
 );
}

function SidebarFooter({
 className,
 ...props
}: React.ComponentProps<"div">) {
 return (
 <div
 data-sidebar="footer"
 className={cn("flex flex-col gap-2 p-2", className)}
 {...props}
 />
 );
}

function SidebarHeader({
 className,
 ...props
}: React.ComponentProps<"div">) {
 return (
 <div
 data-sidebar="header"
 className={cn("flex flex-col gap-2 p-2", className)}
 {...props}
 />
 );
}

function SidebarContent({
 className,
 ...props
}: React.ComponentProps<"div">) {
 return (
 <div
 data-sidebar="content"
 className={cn(
 "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
 className,
 )}
 {...props}
 />
 );
}

function SidebarGroup({
 className,
 ...props
}: React.ComponentProps<"div">) {
 return (
 <div
 data-sidebar="group"
 className={cn(
 "relative flex w-full min-w-0 flex-col gap-2 p-2",
 className,
 )}
 {...props}
 />
 );
}

function SidebarGroupLabel({
 className,
 ...props
}: React.ComponentProps<"div">) {
 return (
 <div
 data-sidebar="group-label"
 className={cn(
 "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,olor] duration-200 focus-visible:ring-2 group-data-[collapsible=icon]:hidden",
 className,
 )}
 {...props}
 />
 );
}

function SidebarGroupAction({
 className,
 asChild = false,
 ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
 const Comp = asChild ? Slot : "button";

 return (
 <Comp
 data-sidebar="group-action"
 className={cn(
 "absolute top-3.5 -translate-y-1/2 rounded-md p-1 text-sidebar-foreground outline-none ring-sidebar-ring transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 opacity-0 group-hover:opacity-100 group-data-[collapsible=icon]:hidden group-data-[side=left]:end-3.5 group-data-[side=right]:start-3.5",
 className,
 )}
 {...props}
 />
 );
}

function SidebarSeparator({
 className,
 ...props
}: React.ComponentProps<"hr">) {
 return (
 <hr
 data-sidebar="separator"
 className={cn(
 "mx-2 my-2 border-sidebar-border group-data-[collapsible=icon]:mx-0",
 className,
 )}
 {...props}
 />
 );
}

export {
 Sidebar,
 SidebarContent,
 SidebarFooter,
 SidebarGroup,
 SidebarGroupAction,
 SidebarGroupLabel,
 SidebarHeader,
 SidebarInset,
 SidebarMenu,
 SidebarMenuAction,
 SidebarMenuBadge,
 SidebarMenuButton,
 SidebarMenuSeparator,
 SidebarMenuItem,
 SidebarMenuSkeleton,
 SidebarMenuSub,
 SidebarMenuSubButton,
 SidebarMenuSubItem,
 SidebarProvider,
 SidebarRail,
 SidebarSeparator,
 SidebarTrigger,
 useSidebar,
};
