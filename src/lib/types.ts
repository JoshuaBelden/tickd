export type Priority = "none" | "low" | "medium" | "high" | "urgent"

export interface StatusConfig {
  id: string
  name: string
  color: string
  isDone: boolean
  order: number
}

export const DEFAULT_STATUSES: StatusConfig[] = [
  { id: "backlog", name: "Backlog", color: "#888888", isDone: false, order: 0 },
  { id: "todo", name: "Todo", color: "#3b82f6", isDone: false, order: 1 },
  { id: "in-progress", name: "In Progress", color: "#f59e0b", isDone: false, order: 2 },
  { id: "today", name: "Today", color: "#10b981", isDone: false, order: 3 },
  { id: "done", name: "Done", color: "#6366f1", isDone: true, order: 4 },
]

export interface UserSettings {
  userId: string
  statusConfig: StatusConfig[]
}

export interface List {
  _id: string
  userId: string
  name: string
  color: string
  icon: string
  order: number
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ChecklistItem {
  id: string
  label: string
  checked: boolean
}

export interface Checklist {
  id: string
  title: string
  items: ChecklistItem[]
}

export interface NodePosition {
  x: number
  y: number
}

export interface Task {
  _id: string
  userId: string
  listId: string
  parentId: string | null
  title: string
  description: unknown | null
  status: string
  priority: Priority
  dueDate: string | null
  tags: string[]
  checklist: ChecklistItem[]
  checklists: Checklist[]
  order: number
  nodePosition: NodePosition | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  subtasks?: Task[]
}

export interface TaskSearchResult extends Task {
  listName: string
  listIcon: string
  listColor: string
  listDeleted: boolean
}

export interface FilterState {
  status: string | null
  priority: Priority | null
  tag: string | null
  dueDateFrom: string | null
  dueDateTo: string | null
}

export type SortField = "dueDate" | "priority" | "createdAt" | "order"
export type GroupBy = "status" | "priority" | "none"
