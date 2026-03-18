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

  let confirmDelete = $state(false)

  const dueDateClass = $derived(
    isOverdue(task.dueDate) && !isDone
      ? "text-red-400"
      : isDueToday(task.dueDate) && !isDone
        ? "text-amber-400"
        : "text-gray-500",
  )

  const priorityDotColor = $derived(priorityColor(task.priority))

  let statusMenuOpen = $state(false)

  function openStatusMenu(e: MouseEvent) {
    e.stopPropagation()
    statusMenuOpen = true
  }

  function selectStatus(e: MouseEvent, statusId: string) {
    e.stopPropagation()
    statusMenuOpen = false
    if (statusId !== task.status) {
      onUpdate(task._id, { status: statusId })
    }
  }

  function closeStatusMenu(e: MouseEvent) {
    statusMenuOpen = false
  }
</script>

{#if statusMenuOpen}
  <div class="fixed inset-0 z-40" onclick={closeStatusMenu} onkeydown={e => e.key === "Escape" && closeStatusMenu(e as any)} role="presentation"></div>
{/if}

<div
  class="group flex items-center gap-3 px-3 py-2 rounded hover:bg-white/5 cursor-pointer border border-transparent {selected
    ? 'border-accent/50 bg-white/5'
    : ''} {isDone ? 'opacity-50' : ''}"
  {onclick}
  onkeydown={e => (e.key === "Enter" || e.key === " ") && onclick()}
  role="button"
  tabindex="0"
>
  <!-- Status indicator -->
  <div class="relative flex-shrink-0">
    <button
      class="w-4 h-4 rounded-full border-2 transition-colors hover:opacity-80"
      style="border-color: {statusInfo?.color ?? '#888'}; background: {isDone
        ? (statusInfo?.color ?? '#888')
        : 'transparent'}"
      onclick={openStatusMenu}
      title="Change status"
    ></button>
    {#if statusMenuOpen}
      <div class="absolute left-0 top-5 z-50 bg-gray-900 border border-white/10 rounded shadow-xl py-1 min-w-32">
        {#each statusConfig as s (s.id)}
          <button
            class="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-white/10 transition-colors {s.id === task.status ? 'opacity-50' : ''}"
            onclick={e => selectStatus(e, s.id)}
          >
            <span class="w-3 h-3 rounded-full flex-shrink-0" style="background: {s.color}"></span>
            {s.name}
          </button>
        {/each}
      </div>
    {/if}
  </div>

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
  {#if confirmDelete}
    <span class="flex items-center gap-1 flex-shrink-0">
      <button
        class="text-xs text-red-400 hover:text-red-300"
        onclick={e => { e.stopPropagation(); onDelete(task._id) }}
        title="Confirm delete">Yes</button>
      <button
        class="text-xs text-gray-500 hover:text-gray-300"
        onclick={e => { e.stopPropagation(); confirmDelete = false }}
        title="Cancel">No</button>
    </span>
  {:else}
    <button
      class="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-opacity flex-shrink-0"
      onclick={e => { e.stopPropagation(); confirmDelete = true }}
      title="Delete">×</button>
  {/if}
</div>
