<script lang="ts">
  import { browser } from "$app/environment"
  import BoardView from "$lib/components/BoardView.svelte"
  import TaskCard from "$lib/components/TaskCard.svelte"
  import TaskDetail from "$lib/components/TaskDetail.svelte"
  import { selectedTaskId, viewMode } from "$lib/stores/ui"
  import type { GroupBy, SortField, Task } from "$lib/types"
  import { priorityOrder } from "$lib/utils"
  import { untrack } from "svelte"

  let { data } = $props()

  let tasks = $state<Task[]>(untrack(() => data.tasks))
  let allTags = $state<string[]>(untrack(() => data.allTags))
  let list = $state(untrack(() => data.list))

  $effect(() => {
    tasks = data.tasks
    list = data.list
    allTags = data.allTags
  })

  let showNewTask = $state(false)
  let newTaskTitle = $state("")
  let newTaskStatus = $state(untrack(() => data.list.statusConfig[1]?.id ?? data.list.statusConfig[0]?.id ?? "todo"))

  // Filters
  let filterStatus = $state<string | null>(null)
  let filterPriority = $state<string | null>(null)
  let sortBy = $state<SortField>("order")
  let groupBy = $state<GroupBy>("status")

  // Keyboard shortcut
  function onKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement
    if (e.key === "n" && target.tagName === "BODY") {
      showNewTask = true
    }
    if (e.key === "Escape") {
      $selectedTaskId = null
      showNewTask = false
    }
  }

  let selectedTask = $derived(tasks.find(t => t._id === $selectedTaskId) ?? null)

  let filteredTasks = $derived.by(() => {
    let result = [...tasks]
    if (filterStatus) result = result.filter(t => t.status === filterStatus)
    if (filterPriority) result = result.filter(t => t.priority === filterPriority)

    result.sort((a, b) => {
      if (sortBy === "dueDate") {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
      if (sortBy === "priority") return priorityOrder(b.priority) - priorityOrder(a.priority)
      if (sortBy === "createdAt") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      return a.order - b.order
    })

    return result
  })

  let groupedTasks = $derived.by(() => {
    if (groupBy === "none")
      return [
        {
          key: "all",
          label: "All Tasks",
          color: undefined,
          isDone: false,
          tasks: filteredTasks.filter(t => !t.parentId),
        },
      ]

    if (groupBy === "status") {
      return list.statusConfig.map((s: import("$lib/types").StatusConfig) => ({
        key: s.id,
        label: s.name,
        color: s.color,
        isDone: s.isDone,
        tasks: filteredTasks.filter(t => t.status === s.id && !t.parentId),
      }))
    }

    const priorities = ["urgent", "high", "medium", "low", "none"] as const
    return priorities.map(p => ({
      key: p,
      label: p.charAt(0).toUpperCase() + p.slice(1),
      color: undefined,
      isDone: false,
      tasks: filteredTasks.filter(t => t.priority === p && !t.parentId),
    }))
  })

  async function createTask() {
    if (!newTaskTitle.trim()) return
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listId: data.list._id,
        title: newTaskTitle,
        status: newTaskStatus,
        parentId: null,
      }),
    })
    const task = await res.json()
    tasks = [...tasks, task]
    newTaskTitle = ""
    showNewTask = false
    $selectedTaskId = task._id
  }

  async function updateTask(taskId: string, updates: Partial<Task>) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    const updated = await res.json()
    tasks = tasks.map(t => (t._id === taskId ? { ...t, ...updated } : t))
  }

  async function deleteTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" })
    tasks = tasks.filter(t => t._id !== taskId && t.parentId !== taskId)
    if ($selectedTaskId === taskId) $selectedTaskId = null
  }

  async function createSubtask(parentId: string, title: string) {
    const parent = tasks.find(t => t._id === parentId)
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listId: data.list._id,
        title,
        status: parent?.status ?? newTaskStatus,
        parentId,
      }),
    })
    const task = await res.json()
    tasks = [...tasks, task]
  }
</script>

<svelte:window on:keydown={onKeyDown} />

<div class="flex h-full">
  <!-- Main Content -->
  <div class="flex-1 flex flex-col overflow-hidden min-w-0">
    <!-- Top bar -->
    <header class="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
      <h1 class="font-semibold text-lg flex items-center gap-2 mr-1">
        <span>{list.icon}</span>
        <span class="truncate max-w-[160px] sm:max-w-none">{list.name}</span>
      </h1>

      <div class="flex items-center gap-1 bg-surface rounded p-0.5 border border-border">
        <button
          class="px-2.5 py-1 text-xs rounded transition-colors {$viewMode === 'list'
            ? 'bg-white/10 text-white'
            : 'text-gray-400 hover:text-gray-200'}"
          onclick={() => ($viewMode = "list")}>List</button
        >
        <button
          class="px-2.5 py-1 text-xs rounded transition-colors {$viewMode === 'board'
            ? 'bg-white/10 text-white'
            : 'text-gray-400 hover:text-gray-200'}"
          onclick={() => ($viewMode = "board")}>Board</button
        >
        <button
          class="px-2.5 py-1 text-xs rounded transition-colors {$viewMode === 'map'
            ? 'bg-white/10 text-white'
            : 'text-gray-400 hover:text-gray-200'}"
          onclick={() => ($viewMode = "map")}>Map</button
        >
      </div>

      <div class="flex items-center gap-2 ml-auto flex-wrap">
        <!-- Filters -->
        <select class="text-xs bg-surface border border-border rounded px-2 py-1 text-gray-300 hidden sm:block" bind:value={groupBy}>
          <option value="status">Group: Status</option>
          <option value="priority">Group: Priority</option>
          <option value="none">No grouping</option>
        </select>
        <select class="text-xs bg-surface border border-border rounded px-2 py-1 text-gray-300 hidden sm:block" bind:value={sortBy}>
          <option value="order">Sort: Manual</option>
          <option value="dueDate">Sort: Due Date</option>
          <option value="priority">Sort: Priority</option>
          <option value="createdAt">Sort: Created</option>
        </select>

        <button class="btn-primary text-xs" onclick={() => (showNewTask = true)}> + New Task </button>
      </div>
    </header>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      {#if $viewMode === "list"}
        <div class="p-6 space-y-6">
          {#each groupedTasks as group (group.key)}
            {#if group.tasks.length > 0 || groupBy === "status"}
              <div>
                <div class="flex items-center gap-2 mb-2">
                  {#if group.color}
                    <span class="w-2 h-2 rounded-full" style="background:{group.color}"></span>
                  {/if}
                  <span class="text-sm font-medium text-gray-300">{group.label}</span>
                  <span class="text-xs text-gray-500">{group.tasks.length}</span>
                </div>

                <div class="space-y-1">
                  {#each group.tasks as task (task._id)}
                    <TaskCard
                      {task}
                      {tasks}
                      statusConfig={list.statusConfig}
                      selected={$selectedTaskId === task._id}
                      onclick={() => ($selectedTaskId = task._id)}
                      onUpdate={updateTask}
                      onDelete={deleteTask}
                    />
                  {/each}
                </div>
              </div>
            {/if}
          {/each}

        </div>
      {:else if $viewMode === "board"}
        <BoardView
          tasks={filteredTasks}
          allTasks={tasks}
          statusConfig={list.statusConfig}
          selectedTaskId={$selectedTaskId}
          onTaskClick={id => ($selectedTaskId = id)}
          onUpdate={updateTask}
          onDelete={deleteTask}
        />
      {:else}
        <!-- Map view -->
        {#if browser}
          {#await import("$lib/components/MindMap.svelte") then { default: MindMap }}
            <MindMap
              {tasks}
              {list}
              onTaskClick={id => ($selectedTaskId = id)}
              onUpdatePosition={async (id, pos) => {
                await fetch(`/api/tasks/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ nodePosition: pos }),
                })
              }}
            />
          {/await}
        {/if}
      {/if}
    </div>
  </div>
</div>

<!-- New Task Modal -->
{#if showNewTask}
  <div
    class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
    onclick={() => (showNewTask = false)}
    onkeydown={e => e.key === "Escape" && (showNewTask = false)}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="card w-full max-w-md space-y-4" onclick={e => e.stopPropagation()} role="presentation">
      <h2 class="font-semibold">New Task</h2>
      <!-- svelte-ignore a11y_autofocus -->
      <input
        class="input w-full"
        placeholder="Task title..."
        bind:value={newTaskTitle}
        onkeydown={e => {
          if (e.key === "Enter") createTask()
          if (e.key === "Escape") showNewTask = false
        }}
        autofocus
      />
      <div>
        <label class="text-xs text-gray-400 block mb-1" for="new-task-status">Status</label>
        <select id="new-task-status" class="text-xs bg-surface border border-border rounded px-2 py-1 text-gray-300" bind:value={newTaskStatus}>
          {#each list.statusConfig as s (s.id)}
            <option value={s.id}>{s.name}</option>
          {/each}
        </select>
      </div>
      <div class="flex gap-2 justify-end pt-1">
        <button class="btn-ghost" onclick={() => (showNewTask = false)}>Cancel</button>
        <button class="btn-primary" onclick={createTask}>Add Task</button>
      </div>
    </div>
  </div>
{/if}

<!-- Task Detail Modal -->
{#if selectedTask}
  <TaskDetail
    task={selectedTask}
    {tasks}
    statusConfig={list.statusConfig}
    {allTags}
    onUpdate={updateTask}
    onDelete={deleteTask}
    onCreateSubtask={createSubtask}
    onClose={() => ($selectedTaskId = null)}
  />
{/if}
