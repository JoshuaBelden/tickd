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
  }: {
    tasks: Task[]
    allTasks: Task[]
    statusConfig: StatusConfig[]
    selectedTaskId: string | null
    onTaskClick: (id: string) => void
    onUpdate: (id: string, updates: Partial<Task>) => Promise<void>
    onDelete: (id: string) => Promise<void>
  } = $props()

  let draggedTaskId = $state<string | null>(null)
  let dragOverStatus = $state<string | null>(null)

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
</script>

<div class="flex gap-4 p-6 h-full overflow-x-auto items-start">
  {#each columns as col (col.id)}
    <div
      class="flex-shrink-0 w-72 flex flex-col rounded-lg border transition-colors {dragOverStatus === col.id
        ? 'border-accent/60 bg-white/[0.07]'
        : 'border-border bg-surface'}"
      ondragover={e => onDragOver(e, col.id)}
      ondragleave={e => onDragLeave(e, col.id)}
      ondrop={e => onDrop(e, col.id)}
      role="group"
      aria-label={col.name}
    >
      <!-- Column header -->
      <div class="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:{col.color}"></span>
        <span class="text-sm font-medium text-gray-200">{col.name}</span>
        <span class="text-xs text-gray-500 ml-auto tabular-nums">{col.tasks.length}</span>
      </div>

      <!-- Cards -->
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
      </div>
    </div>
  {/each}
</div>
