<script lang="ts">
  import type { StatusConfig, Task } from "$lib/types"
  import { formatDate, isDueToday, isOverdue, priorityColor } from "$lib/utils"

  let {
    tasks,
    allTasks,
    statusConfig,
    selectedTaskId,
    onTaskClick,
    onUpdate,
    onDelete,
    onArchiveAllDone,
    onCreateTask,
  }: {
    tasks: Task[]
    allTasks: Task[]
    statusConfig: StatusConfig[]
    selectedTaskId: string | null
    onTaskClick: (id: string) => void
    onUpdate: (id: string, updates: Partial<Task>) => Promise<void>
    onDelete: (id: string) => Promise<void>
    onArchiveAllDone: () => Promise<void>
    onCreateTask: (title: string, statusId: string) => Promise<void>
  } = $props()

  let draggedTaskId = $state<string | null>(null)
  let dragOverStatus = $state<string | null>(null)

  const STORAGE_KEY = "boardCollapsedColumns"

  function loadCollapsed(): Set<string> {
    if (typeof window === "undefined") return new Set()
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? new Set(JSON.parse(raw)) : new Set()
    } catch {
      return new Set()
    }
  }

  let collapsed = $state<Set<string>>(loadCollapsed())

  function toggleCollapsed(statusId: string) {
    const next = new Set(collapsed)
    if (next.has(statusId)) next.delete(statusId)
    else next.add(statusId)
    collapsed = next
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
    }
  }

  const columns = $derived(
    statusConfig.map(s => ({
      ...s,
      tasks: tasks.filter(t => t.status === s.id && !t.parentId),
    })),
  )

  function onDragStart(e: DragEvent, taskId: string) {
    draggedTaskId = taskId
    e.dataTransfer!.effectAllowed = "move"
  }

  function onDragOver(e: DragEvent, statusId: string) {
    e.preventDefault()
    e.dataTransfer!.dropEffect = "move"
    dragOverStatus = statusId
  }

  function onDragLeave(e: DragEvent, statusId: string) {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      if (dragOverStatus === statusId) dragOverStatus = null
    }
  }

  async function onDrop(e: DragEvent, statusId: string) {
    e.preventDefault()
    if (draggedTaskId) {
      const task = allTasks.find(t => t._id === draggedTaskId)
      if (task && task.status !== statusId) {
        await onUpdate(draggedTaskId, { status: statusId })
      }
    }
    draggedTaskId = null
    dragOverStatus = null
  }

  function onDragEnd() {
    draggedTaskId = null
    dragOverStatus = null
  }

  let confirmDeleteId = $state<string | null>(null)
  let confirmArchiveAllDoneCol = $state<string | null>(null)
  let inlineAddCol = $state<string | null>(null)
  let inlineAddTitle = $state("")
</script>

<div class="flex gap-4 p-6 h-full overflow-x-auto items-start">
  {#each columns as col (col.id)}
    {@const isCollapsed = collapsed.has(col.id)}
    <div
      class="flex-shrink-0 flex flex-col rounded-lg border transition-all duration-200 {isCollapsed
        ? 'w-10'
        : 'w-72'} {dragOverStatus === col.id
        ? 'border-accent/60 bg-white/[0.07]'
        : 'border-border bg-surface'}"
      ondragover={e => onDragOver(e, col.id)}
      ondragleave={e => onDragLeave(e, col.id)}
      ondrop={e => onDrop(e, col.id)}
      role="group"
      aria-label={col.name}
    >
      <!-- Column header -->
      {#if isCollapsed}
        <button
          class="flex flex-col items-center justify-start gap-3 py-4 px-2 h-full w-full cursor-pointer hover:bg-white/5 rounded-lg transition-colors"
          onclick={() => toggleCollapsed(col.id)}
          title="Expand {col.name}"
        >
          <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:{col.color}"></span>
          <span
            class="text-xs font-medium text-gray-400 writing-mode-vertical"
            style="writing-mode:vertical-rl; transform:rotate(180deg); letter-spacing:0.05em;"
          >{col.name}</span>
          <span class="text-xs text-gray-600 tabular-nums mt-auto">{col.tasks.length}</span>
        </button>
      {:else}
        <div class="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
          <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:{col.color}"></span>
          <span class="text-sm font-medium text-gray-200">{col.name}</span>
          <span class="text-xs text-gray-500 ml-auto tabular-nums">{col.tasks.length}</span>
          {#if col.isDone && col.tasks.length > 0}
            {#if confirmArchiveAllDoneCol === col.id}
              <span class="text-xs text-gray-500">Archive all?</span>
              <button class="text-xs text-yellow-400 hover:text-yellow-300" onclick={async e => { e.stopPropagation(); await onArchiveAllDone(); confirmArchiveAllDoneCol = null }}>Yes</button>
              <button class="text-xs text-gray-500 hover:text-gray-300" onclick={e => { e.stopPropagation(); confirmArchiveAllDoneCol = null }}>No</button>
            {:else}
              <button class="text-xs text-gray-600 hover:text-gray-400" onclick={e => { e.stopPropagation(); confirmArchiveAllDoneCol = col.id }}>Archive all</button>
            {/if}
          {/if}
          <button
            class="text-gray-600 hover:text-gray-300 transition-colors ml-1 text-xs leading-none"
            onclick={() => toggleCollapsed(col.id)}
            title="Collapse"
          >‹</button>
        </div>
      {/if}

      <!-- Cards -->
      {#if !isCollapsed}
      <div class="flex flex-col gap-2 p-3 min-h-16">
        {#each col.tasks as task (task._id)}
          {@const subtaskCount = allTasks.filter(t => t.parentId === task._id).length}
          {@const checklistTotal =
            task.checklists && task.checklists.length > 0
              ? task.checklists.reduce((sum, cl) => sum + cl.items.length, 0)
              : (task.checklist?.length ?? 0)}
          {@const checklistDone =
            task.checklists && task.checklists.length > 0
              ? task.checklists.reduce((sum, cl) => sum + cl.items.filter(i => i.checked).length, 0)
              : (task.checklist?.filter(c => c.checked).length ?? 0)}
          {@const dueDateClass =
            isOverdue(task.dueDate) && !col.isDone
              ? "text-red-400"
              : isDueToday(task.dueDate) && !col.isDone
                ? "text-amber-400"
                : "text-gray-500"}
          <div
            class="group bg-black/20 border rounded-md p-3 cursor-pointer hover:bg-white/5 transition-colors select-none
              {selectedTaskId === task._id ? 'border-accent/50' : 'border-white/5'}
              {col.isDone ? 'opacity-60' : ''}
              {draggedTaskId === task._id ? 'opacity-30 scale-95' : ''}"
            draggable="true"
            ondragstart={e => onDragStart(e, task._id)}
            ondragend={onDragEnd}
            onclick={() => onTaskClick(task._id)}
            onkeydown={e => (e.key === "Enter" || e.key === " ") && onTaskClick(task._id)}
            role="button"
            tabindex="0"
          >
            <!-- Title + priority -->
            <div class="flex items-start gap-2 mb-2">
              <span
                class="text-sm flex-1 leading-snug {col.isDone
                  ? 'line-through text-gray-500'
                  : 'text-gray-100'}"
              >{task.title}</span>
              {#if task.priority !== "none"}
                <span
                  class="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                  style="background:{priorityColor(task.priority)}"
                  title={task.priority}
                ></span>
              {/if}
            </div>

            <!-- Tags -->
            {#if task.tags.length > 0}
              <div class="flex flex-wrap gap-1 mb-2">
                {#each task.tags.slice(0, 3) as tag}
                  <span class="text-xs text-gray-500 bg-white/5 rounded px-1.5 py-0.5">{tag}</span>
                {/each}
              </div>
            {/if}

            <!-- Footer: due date, checklist, subtasks, delete -->
            <div class="flex items-center gap-2 flex-wrap">
              {#if task.dueDate}
                <span class="text-xs {dueDateClass}">{formatDate(task.dueDate)}</span>
              {/if}
              {#if checklistTotal > 0}
                <span class="text-xs text-gray-500 bg-white/5 rounded px-1"
                  >{checklistDone}/{checklistTotal}</span
                >
              {/if}
              {#if subtaskCount > 0}
                <span class="text-xs text-gray-500">↳ {subtaskCount}</span>
              {/if}

              <div class="ml-auto">
                {#if confirmDeleteId === task._id}
                  <span class="flex items-center gap-1">
                    <button
                      class="text-xs text-red-400 hover:text-red-300"
                      onclick={e => {
                        e.stopPropagation()
                        onDelete(task._id)
                        confirmDeleteId = null
                      }}>Yes</button
                    >
                    <button
                      class="text-xs text-gray-500 hover:text-gray-300"
                      onclick={e => {
                        e.stopPropagation()
                        confirmDeleteId = null
                      }}>No</button
                    >
                  </span>
                {:else}
                  <button
                    class="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-opacity"
                    onclick={e => {
                      e.stopPropagation()
                      confirmDeleteId = task._id
                    }}
                    title="Delete">×</button
                  >
                {/if}
              </div>
            </div>
          </div>
        {/each}
        {#if inlineAddCol === col.id}
          <!-- svelte-ignore a11y_autofocus -->
          <input
            class="w-full bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none px-2 py-1.5 border border-border rounded"
            placeholder="Task title, then Enter…"
            bind:value={inlineAddTitle}
            autofocus
            onkeydown={async e => {
              if (e.key === "Enter") {
                await onCreateTask(inlineAddTitle, col.id)
                inlineAddTitle = ""
              }
              if (e.key === "Escape") {
                inlineAddCol = null
                inlineAddTitle = ""
              }
            }}
            onblur={() => {
              inlineAddCol = null
              inlineAddTitle = ""
            }}
          />
        {:else}
          <button
            class="text-xs text-gray-600 hover:text-gray-400 w-full text-left py-1 px-2 transition-colors"
            onclick={() => { inlineAddCol = col.id; inlineAddTitle = "" }}
          >+ Add task</button>
        {/if}
      </div>
      {/if}
    </div>
  {/each}
</div>
