<script lang="ts">
  import type { StatusConfig, Tag, Task } from "$lib/types"
  import { formatDate, isDueToday, isOverdue, priorityColor } from "$lib/utils"
  import { getContext } from "svelte"

  const tagsCtx = getContext<{ get: () => Tag[] }>("tags")
  const allTags = $derived(tagsCtx.get())
  const resolvedTags = $derived(
    task.tags
      .map(id => allTags.find(t => t._id === id))
      .filter(Boolean) as Tag[]
  )

  let {
    task,
    tasks,
    statusConfig,
    selected,
    onclick,
    onUpdate,
    onDelete,
    indent = false,
  }: {
    task: Task
    tasks: Task[]
    statusConfig: StatusConfig[]
    selected: boolean
    onclick: () => void
    onUpdate: (id: string, updates: Partial<Task>) => Promise<void>
    onDelete: (id: string) => Promise<void>
    indent?: boolean
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
  class="group flex items-center px-4 py-1 border-b border-border/40 hover:bg-white/5 cursor-pointer {selected
    ? 'bg-white/5'
    : ''} {isDone ? 'opacity-50' : ''} {indent ? 'pl-10 bg-black/10' : ''}"
  {onclick}
  onkeydown={e => (e.key === "Enter" || e.key === " ") && onclick()}
  role="button"
  tabindex="0"
>
  <!-- Title column (flex-1): status dot + title + inline meta -->
  <div class="flex-1 flex items-center gap-2 min-w-0">
    {#if indent}
      <span class="text-gray-700 flex-shrink-0 text-xs">↳</span>
    {/if}
    <!-- Status indicator -->
    <div class="relative flex-shrink-0">
      <button
        class="w-2.5 h-2.5 rounded-full transition-colors hover:opacity-80"
        style="background: {statusInfo?.color ?? '#888'}"
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
  </div>

  <!-- Pills -->
  <div class="flex items-center gap-1.5 px-4 flex-shrink-0">
    {#if checklistTotal > 0}
      <span class="text-xs text-gray-500 bg-white/5 rounded px-1">Checklist {checklistDone}/{checklistTotal}</span>
    {/if}
    {#if subtaskCount > 0}
      <span class="text-xs text-gray-500 bg-white/5 rounded px-1">Subtasks {doneSubtasks}/{subtaskCount}</span>
    {/if}
    {#each resolvedTags.slice(0, 2) as tag}
      <span
        class="text-xs rounded px-1.5 py-0.5"
        style="background-color: {tag.color}25; color: {tag.color}"
      >{tag.name}</span>
    {/each}
  </div>

  <!-- Priority column -->
  <div class="hidden sm:flex w-28 flex-shrink-0 items-center gap-1.5">
    {#if task.priority !== "none"}
      <svg class="w-3 h-3 flex-shrink-0" viewBox="0 0 10 12" fill="currentColor" style="color:{priorityDotColor}">
        <rect x="0.75" y="0" width="1.5" height="12" rx="0.75"/>
        <path d="M2.25 0.5 L9.5 0.5 L7.5 3 L9.5 5.5 L2.25 5.5 Z"/>
      </svg>
      <span class="text-xs capitalize" style="color:{priorityDotColor}">{task.priority}</span>
    {/if}
  </div>

  <!-- Due date column -->
  <div class="hidden sm:block w-28 flex-shrink-0">
    {#if task.dueDate}
      <span class="text-xs {dueDateClass}">{formatDate(task.dueDate)}</span>
    {/if}
  </div>

  <!-- Delete column -->
  <div class="w-6 flex-shrink-0 flex items-center justify-center">
    {#if confirmDelete}
      <span class="flex items-center gap-1">
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
        class="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-opacity"
        onclick={e => { e.stopPropagation(); confirmDelete = true }}
        title="Delete">×</button>
    {/if}
  </div>
</div>
