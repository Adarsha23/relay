import { cn } from "@/lib/utils";

export type Status = "backlog" | "todo" | "in_progress" | "done" | "canceled";
export type Priority = "none" | "low" | "medium" | "high" | "urgent";

export const STATUS_META: Record<Status, { label: string; color: string }> = {
  backlog: { label: "Backlog", color: "#6b7280" },
  todo: { label: "Todo", color: "#9ca1ad" },
  in_progress: { label: "In Progress", color: "#f5b544" },
  done: { label: "Done", color: "#4cc8a3" },
  canceled: { label: "Canceled", color: "#676c78" },
};

export const STATUS_ORDER: Status[] = ["in_progress", "todo", "backlog", "done", "canceled"];

export const PRIORITY_META: Record<Priority, { label: string }> = {
  urgent: { label: "Urgent" },
  high: { label: "High" },
  medium: { label: "Medium" },
  low: { label: "Low" },
  none: { label: "No priority" },
};

export const PRIORITY_ORDER: Priority[] = ["urgent", "high", "medium", "low", "none"];
const PRIORITY_RANK: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1, none: 0 };
export const priorityRank = (p: Priority) => PRIORITY_RANK[p];

export function StatusIcon({ status, className }: { status: Status; className?: string }) {
  const color = STATUS_META[status].color;
  const ring = { cx: 7, cy: 7, r: 6, fill: "none", stroke: color, strokeWidth: 1.5 };
  return (
    <svg viewBox="0 0 14 14" className={cn("size-3.5 shrink-0", className)} aria-hidden>
      {status === "backlog" && <circle {...ring} strokeDasharray="2 2.2" />}
      {status === "todo" && <circle {...ring} />}
      {status === "in_progress" && (
        <>
          <circle {...ring} strokeOpacity={0.35} />
          {/* thick inner ring acts as a pie sector to show progress */}
          <circle
            cx={7}
            cy={7}
            r={3}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeDasharray="10.4 18.85"
            transform="rotate(-90 7 7)"
          />
        </>
      )}
      {status === "done" && (
        <>
          <circle cx={7} cy={7} r={7} fill={color} />
          <path d="M4 7.2 6.1 9.3 10 5" fill="none" stroke="#0c0d10" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {status === "canceled" && (
        <>
          <circle cx={7} cy={7} r={7} fill={color} />
          <path d="M4.6 4.6 9.4 9.4 M9.4 4.6 4.6 9.4" stroke="#0c0d10" strokeWidth={1.6} strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  if (priority === "urgent") {
    return (
      <svg viewBox="0 0 14 14" className={cn("size-3.5 shrink-0", className)} aria-hidden>
        <rect x={0.5} y={0.5} width={13} height={13} rx={3} fill="#e5484d" />
        <rect x={6.2} y={3} width={1.6} height={5} rx={0.8} fill="#0c0d10" />
        <rect x={6.2} y={9.4} width={1.6} height={1.6} rx={0.8} fill="#0c0d10" />
      </svg>
    );
  }
  const level = PRIORITY_RANK[priority]; // 0..3
  const bars = [
    { x: 1.5, y: 8.5, h: 4 },
    { x: 5.5, y: 5.5, h: 7 },
    { x: 9.5, y: 2.5, h: 10 },
  ];
  return (
    <svg viewBox="0 0 14 14" className={cn("size-3.5 shrink-0", className)} aria-hidden>
      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width={3}
          height={b.h}
          rx={1}
          fill="#9ca1ad"
          opacity={i < level ? 1 : 0.3}
        />
      ))}
    </svg>
  );
}

export function Avatar({
  name,
  color,
  className,
}: {
  name: string;
  color: string;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium text-[#0c0d10]",
        className,
      )}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials}
    </span>
  );
}
