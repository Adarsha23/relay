import { Doc } from "@/convex/_generated/dataModel";
import { STATUS_ORDER, priorityRank, type Status, type Priority } from "./issue-meta";

// Group issues by status (in board order); within a group, highest priority then oldest first.
export function groupIssues(issues: Doc<"issues">[]) {
  const byStatus = new Map<Status, Doc<"issues">[]>();
  for (const s of STATUS_ORDER) byStatus.set(s, []);
  for (const i of issues) byStatus.get(i.status as Status)?.push(i);

  const groups = STATUS_ORDER.map((status) => ({
    status,
    issues: (byStatus.get(status) ?? []).sort(
      (a, b) =>
        priorityRank(b.priority as Priority) - priorityRank(a.priority as Priority) ||
        a.number - b.number,
    ),
  })).filter((g) => g.issues.length > 0);

  const flat = groups.flatMap((g) => g.issues);
  return { groups, flat };
}
