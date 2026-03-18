import type { Priority, Task } from "./types"

export function priorityOrder(p: Priority): number {
  return { urgent: 4, high: 3, medium: 2, low: 1, none: 0 }[p] ?? 0
}

export function priorityLabel(p: Priority): string {
  return { urgent: "Urgent", high: "High", medium: "Medium", low: "Low", none: "None" }[p] ?? "None"
}

export function priorityColor(p: Priority): string {
  return (
    {
      urgent: "#ef4444",
      high: "#f97316",
      medium: "#eab308",
      low: "#3b82f6",
      none: "#6b7280",
    }[p] ?? "#6b7280"
  )
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

export function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false
  const due = new Date(dueDate)
  const now = new Date()
  return due.toDateString() === now.toDateString()
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function buildTaskTree(tasks: Task[]): Task[] {
  const map = new Map<string, Task & { subtasks: Task[] }>()
  const roots: Task[] = []

  for (const task of tasks) {
    map.set(task._id, { ...task, subtasks: [] })
  }

  for (const task of map.values()) {
    if (task.parentId && map.has(task.parentId)) {
      map.get(task.parentId)!.subtasks.push(task)
    } else {
      roots.push(task)
    }
  }

  return roots
}

export function serializeDoc(doc: any): any {
  if (!doc) return null
  const result = { ...doc }
  if (result._id && typeof result._id === "object" && result._id.toHexString) {
    result._id = result._id.toHexString()
  }
  if (result.userId && typeof result.userId === "object") {
    result.userId = result.userId.toString()
  }
  for (const key of ["createdAt", "updatedAt", "archivedAt", "dueDate"]) {
    if (result[key] instanceof Date) {
      result[key] = result[key].toISOString()
    }
  }
  return result
}
