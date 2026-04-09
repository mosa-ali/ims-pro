import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "not_started" | "ongoing" | "completed";

interface TimelineItem {
  id: number;
  code: string;
  text: string;
  textAr?: string;
  status: Status;
  startDate: Date;
  endDate: Date;
  type: "objective" | "result" | "activity" | "task";
  level: number;
}

interface ProjectPlanTimelineProps {
  items: TimelineItem[];
  viewMode: "weekly" | "monthly";
}

export function ProjectPlanTimeline({ items, viewMode }: ProjectPlanTimelineProps) {
  const timelineData = useMemo(() => {
    if (items.length === 0) return null;

    const allDates = items.flatMap((item) => [new Date(item.startDate), new Date(item.endDate)]);
    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    let columns: Date[];
    let columnWidth: number;
    let formatColumn: (date: Date) => string;

    if (viewMode === "weekly") {
      const weeks = eachWeekOfInterval(
        { start: startOfWeek(minDate), end: endOfWeek(maxDate) },
        { weekStartsOn: 1 }
      );
      columns = weeks;
      columnWidth = 120;
      formatColumn = (date) => `Week ${format(date, "w, MMM yyyy")}`;
    } else {
      const months = eachDayOfInterval({ start: startOfMonth(minDate), end: endOfMonth(maxDate) }).filter(
        (date) => date.getDate() === 1
      );
      columns = months;
      columnWidth = 100;
      formatColumn = (date) => format(date, "MMM yyyy");
    }

    return {
      columns,
      columnWidth,
      formatColumn,
      minDate,
      maxDate,
      totalDays: differenceInDays(maxDate, minDate) + 1,
    };
  }, [items, viewMode]);

  if (!timelineData || items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No timeline data available. Add activities and tasks to see the timeline.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { columns, columnWidth, formatColumn, minDate, maxDate, totalDays } = timelineData;

  const getStatusColor = (status: Status) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "ongoing":
        return "bg-blue-500";
      case "not_started":
        return "bg-gray-300";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "objective":
        return "bg-blue-100 border-blue-300";
      case "result":
        return "bg-green-100 border-green-300";
      case "activity":
        return "bg-yellow-100 border-yellow-300";
      case "task":
        return "bg-purple-100 border-purple-300";
      default:
        return "bg-gray-100 border-gray-300";
    }
  };

  const calculateBarPosition = (startDate: Date, endDate: Date) => {
    const itemStart = new Date(startDate);
    const itemEnd = new Date(endDate);
    
    const daysFromStart = differenceInDays(itemStart, minDate);
    const duration = differenceInDays(itemEnd, itemStart) + 1;
    
    const leftPercent = (daysFromStart / totalDays) * 100;
    const widthPercent = (duration / totalDays) * 100;
    
    return {
      left: `${Math.max(0, leftPercent)}%`,
      width: `${Math.min(100 - leftPercent, widthPercent)}%`,
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline View - {viewMode === "weekly" ? "Weekly" : "Monthly"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            <div className="flex border-b">
              <div className="w-[300px] p-3 font-semibold border-r bg-gray-50 sticky left-0 z-10">
                Item
              </div>
              <div className="flex-1 relative">
                <div className="flex">
                  {columns.map((col, idx) => (
                    <div
                      key={idx}
                      className="border-r p-2 text-center text-xs font-medium bg-gray-50"
                      style={{ minWidth: columnWidth }}
                    >
                      {formatColumn(col)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative">
              {items.map((item, idx) => {
                const barPosition = calculateBarPosition(item.startDate, item.endDate);
                const indentLevel = item.level * 20;

                return (
                  <div key={item.id} className={`flex border-b hover:bg-gray-50 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                    <div className="w-[300px] p-3 border-r sticky left-0 z-10 bg-inherit" style={{ paddingLeft: `${12 + indentLevel}px` }}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.code}
                        </Badge>
                        <span className={`inline-block w-2 h-2 rounded-full ${getStatusColor(item.status)}`} />
                      </div>
                      <p className="text-sm mt-1 truncate" title={item.text}>
                        {item.text}
                      </p>
                      {item.textAr && (
                        <p className="text-xs text-muted-foreground mt-1 truncate" dir="rtl" title={item.textAr}>
                          {item.textAr}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(item.startDate), "MMM dd")} - {format(new Date(item.endDate), "MMM dd, yyyy")}
                      </p>
                    </div>

                    <div className="flex-1 relative p-2">
                      <div className="relative h-12">
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 h-8 rounded border-2 ${getTypeColor(item.type)} ${getStatusColor(item.status)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                          style={barPosition}
                          title={`${item.text}\n${format(new Date(item.startDate), "MMM dd, yyyy")} - ${format(new Date(item.endDate), "MMM dd, yyyy")}\nStatus: ${item.status}`}
                        >
                          <div className="px-2 py-1 text-xs font-medium truncate">
                            {item.code}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-3 text-sm">Legend</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-4 rounded bg-blue-100 border-2 border-blue-300" />
                  <span className="text-xs">Objective</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-4 rounded bg-green-100 border-2 border-green-300" />
                  <span className="text-xs">Result</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-4 rounded bg-yellow-100 border-2 border-yellow-300" />
                  <span className="text-xs">Activity</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-4 rounded bg-purple-100 border-2 border-purple-300" />
                  <span className="text-xs">Task</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-xs">Ongoing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <span className="text-xs">Not Started</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
