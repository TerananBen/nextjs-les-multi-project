import { cn } from "@/lib/utils";

interface AnnouncementBannerProps {
  message?: string;
  className?: string;
}

export const AnnouncementBanner = ({
  message = "Standard IoT Web Control Center",
  className,
}: AnnouncementBannerProps) => (
  <div
    className={cn(
      "w-full rounded-xl border border-border/40 bg-card/60 p-4 text-card-foreground shadow-xs backdrop-blur-md",
      className
    )}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        Shared Design
      </span>
    </div>
  </div>
);

export default AnnouncementBanner;
