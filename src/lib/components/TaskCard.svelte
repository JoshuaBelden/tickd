<script lang="ts">
  import type { StatusConfig, Task } from "$lib/types"
  import { formatDate, isDueToday, isOverdue, priorityColor } from "$lib/utils"

  let {
    task,
    tasks,
    statusConfig,
    selected,
    onclick,
    onUpdate,
    onDelete,
  }: {
    task: Task
    tasks: Task[]
    statusConfig: StatusConfig[]
    selected: boolean
    onclick: () => void
    onUpdate: (id: string, updates: Partial<Task>) => Promise<void>
    onDelete: (id: string) => Promise<void>
  } = $props()

  const subtaskCount = $derived(tasks.filter(t => t.parentId === task._id).length)
  const doneSubtasks = $derived(
    tasks.filter(t => t.parentId === task._id && statusConfig.find(s => s.id === t.status)?.isDone).length,
  )
  const checklistTotal = $derived(
    task.checklists && task.checklists.length > 0
      ? task.checklists.reduce((sum, cl) => sum + cl.items.length, 0)
      : (task.checklist?.length ?? 0),
  )
  const checklistDone = $derived(
    task.checklists && task.checklists.length > 0
      ? task.checklists.reduce((sum, cl) => sum + cl.items.filter(i => i.checked).length, 0)
      : (task.checklist?.filter(c => c.checked).length ?? 0),
  )

  const statusInfo = $derived(statusConfig.find(s => s.id === task.status))
  const isDone = $derived(statusInfo?.isDone ?? false)

  const dueDateClass = $derived(
    isOverdue(task.dueDate) && !isDone
      ? "text-red-400"
      : isDueToday(task.dueDate) && !isDone
        ? "text-amber-400"
        : "text-gray-500",
  )

  const priorityDotColor = $derived(priorityColor(task.priority))

  function cycleStatus(e: MouseEvent) {
    e.stopPropagation()
    const idx = statusConfig.findIndex(s => s.id === task.status)
    const next = statusConfig[(idx + 1) % statusConfig.length]
    onUpdate(task._id, { status: next.id })
  }
</script>

<div
  class="group flex items-center gap-3 px-3 py-2 rounded hover:bg-white/5 cursor-pointer border border-transparent {selected
    ? 'border-accent/50 bg-white/5'
    : ''} {isDone ? 'opacity-50' : ''}"
  {onclick}
  role="button"
  tabindex="0"
>
  <!-- Status indicator -->
  <button
    class="w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors hover:opacity-80"
    style="border-color: {statusInfo?.color ?? '#888'}; background: {isDone
      ? (statusInfo?.color ?? '#888')
      : 'transparent'}"
    onclick={cycleStatus}
    title="Cycle status"
  ></button>

  <!-- Title -->
  <span class="flex-1 text-sm {isDone ? 'line-through text-gray-500' : 'text-gray-100'} truncate">
    {task.title}
  </span>

  <!-- Priority dot -->
  {#if task.priority !== "none"}
    <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:{priorityDotColor}" title={task.priority}></span>
  {/if}

  <!-- Due date -->
  {#if task.dueDate}
    <span class="text-xs {dueDateClass} flex-shrink-0">{formatDate(task.dueDate)}</span>
  {/if}

  <!-- Checklist progress -->
  {#if checklistTotal > 0}
    <span class="text-xs text-gray-500 flex-shrink-0 bg-white/5 rounded px-1">{checklistDone}/{checklistTotal}</span>
  {/if}

  <!-- Subtask count -->
  {#if subtaskCount > 0}
    <span class="text-xs text-gray-500 flex-shrink-0">↳ {subtaskCount}</span>
  {/if}

  <!-- Tags -->
  {#each task.tags.slice(0, 2) as tag}
    <span class="text-xs text-gray-500 bg-white/5 rounded px-1.5 py-0.5 flex-shrink-0">{tag}</span>
  {/each}

  <!-- Delete (hover) -->
  <button
    class="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-opacity flex-shrink-0"
    onclick={e => {
      e.stopPropagation()
      onDelete(task._id)
    }}
    title="Delete">×</button
  >
</div>
