
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "text-sm font-bold text-primary",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-primary/20 absolute left-1 z-10"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-primary/20 absolute right-1 z-10"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex w-full justify-between mb-2",
        weekday: "text-muted-foreground rounded-md w-9 font-bold text-[0.7rem] uppercase tracking-tighter text-center",
        week: "flex w-full mt-2 justify-between",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-primary/10 rounded-md transition-all text-center flex items-center justify-center"
        ),
        day_button: "h-9 w-9 p-0 font-normal w-full flex items-center justify-center",
        selected: "bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white rounded-md shadow-sm",
        today: "bg-accent/20 text-accent-foreground font-bold border border-accent/30",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: (props) => {
          if (props.orientation === "left") return <ChevronLeft className="h-4 w-4 text-primary" />;
          return <ChevronRight className="h-4 w-4 text-primary" />;
        }
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
