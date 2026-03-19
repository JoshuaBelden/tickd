<script lang="ts">
  import { browser } from "$app/environment"
  import { goto } from "$app/navigation"
  import { page } from "$app/stores"
  import BoardView from "$lib/components/BoardView.svelte"
  import HeroIcon from "$lib/components/HeroIcon.svelte"
  import TaskCard from "$lib/components/TaskCard.svelte"
  import TaskDetail from "$lib/components/TaskDetail.svelte"
  import { selectedTaskId, showSearch, viewMode } from "$lib/stores/ui"
  import type { GroupBy, SortField, StatusConfig, Tag, Task } from "$lib/types"
  import { priorityOrder } from "$lib/utils"
  import { getContext, untrack } from "svelte"

  let { data } = $props()

  let tasks = $state<Task[]>(untrack(() => data.tasks))
  let list = $state(untrack(() => data.list))

  const statusConfigCtx = getContext<{ get: () => StatusConfig[] }>("statusConfig")
  const statusConfig = $derived(statusConfigCtx.get())

  const tagsCtx = getContext<{ get: () => Tag[]; set: (t: Tag[]) => void }>("tags")
  const allTags = $derived(tagsCtx.get())

  $effect(() => {
    tasks = data.tasks
    list = data.list
  })

  let showNewTask = $state(false)
  let newTaskTitle = $state("")
  let newTaskStatus = $state(untrack(() => statusConfig[1]?.id ?? statusConfig[0]?.id ?? "todo"))
  let overlayTask = $state<Task | null>(null)
  let confirmArchiveAllDone = $state<string | null>(null)

  let inlineAddGroup = $state<string | null>(null)
  let inlineAddTitle = $state("")

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
      overlayTask = null
      showNewTask = false
    }
  }

  // Handle ?task=<id> URL param (from cross-list search navigation)
  $effect(() => {
    const taskId = $page.url.searchParams.get("task")
    if (!taskId) return
    // Clean the URL immediately
    goto(`/${data.list._id}`, { replaceState: true, noScroll: true })
    const found = tasks.find(t => t._id === taskId)
    if (found) {
      $selectedTaskId = taskId
    } else {
      // Task is archived or from another list — fetch it directly
      fetch(`/api/tasks/${taskId}`)
        .then(r => r.json())
        .then(t => {
          overlayTask = t
        })
    }
  })

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
      return statusConfig.map(s => ({
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

  async function createQuickTask(title: string, status: string) {
    if (!title.trim()) return
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listId: data.list._id,
        title,
        status,
        parentId: null,
      }),
    })
    const task = await res.json()
    tasks = [...tasks, task]
  }

  async function updateTask(taskId: string, updates: Partial<Task>) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    const updated = await res.json()
    if (updated.archivedAt !== null && updated.archivedAt !== undefined) {
      // Task was archived — remove from local state and close detail
      tasks = tasks.filter(t => t._id !== taskId)
      if ($selectedTaskId === taskId) $selectedTaskId = null
    } else if (updated.listId !== data.list._id) {
      // Task was moved to another list — remove from local state and close detail
      tasks = tasks.filter(t => t._id !== taskId)
      if ($selectedTaskId === taskId) $selectedTaskId = null
    } else if (overlayTask?._id === taskId) {
      // Task was unarchived from overlay (e.g. moved to this list) — add to tasks
      overlayTask = null
      tasks = [...tasks, updated]
      $selectedTaskId = updated._id
    } else {
      tasks = tasks.map(t => (t._id === taskId ? { ...t, ...updated } : t))
    }
  }

  async function deleteTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" })
    tasks = tasks.filter(t => t._id !== taskId && t.parentId !== taskId)
    if ($selectedTaskId === taskId) $selectedTaskId = null
  }

  async function archiveAllDone() {
    const res = await fetch("/api/tasks/archive-done", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId: data.list._id }),
    })
    if (res.ok) {
      const doneStatusIds = statusConfig.filter(s => s.isDone).map(s => s.id)
      tasks = tasks.filter(t => !doneStatusIds.includes(t.status))
      if ($selectedTaskId && !tasks.find(t => t._id === $selectedTaskId)) $selectedTaskId = null
    }
    confirmArchiveAllDone = null
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
        <HeroIcon name={list.icon} class="w-5 h-5 flex-shrink-0" style="color:{list.color}" />
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
        <!-- Search icon (desktop only — mobile has it in the layout header) -->
        <button
          class="hidden sm:flex text-gray-500 hover:text-gray-100 transition-colors"
          onclick={() => showSearch.set(true)}
          aria-label="Search tasks"
          title="Search (⌘K)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path
              fill-rule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
        <!-- Filters -->
        <select
          class="text-xs bg-surface border border-border rounded px-2 py-1 text-gray-300 hidden sm:block"
          bind:value={groupBy}
        >
          <option value="status">Group: Status</option>
          <option value="priority">Group: Priority</option>
          <option value="none">No grouping</option>
        </select>
        <select
          class="text-xs bg-surface border border-border rounded px-2 py-1 text-gray-300 hidden sm:block"
          bind:value={sortBy}
        >
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
        <div class="flex flex-col">
          <!-- Column headers -->
          <div class="flex items-center px-4 py-1.5 text-xs text-gray-500 border-b border-border bg-background sticky top-0 z-10">
            <div class="flex-1 flex items-center gap-2">
              <div class="w-2.5 flex-shrink-0"></div><!-- spacer for status dot -->
              <span>Task</span>
            </div>
            <div class="w-28 flex-shrink-0">Priority</div>
            <div class="w-28 flex-shrink-0">Due Date</div>
            <div class="w-6 flex-shrink-0"></div>
          </div>

          {#each groupedTasks as group (group.key)}
            {#if group.tasks.length > 0 || groupBy === "status"}
              <!-- Status group header -->
              <div class="flex items-center gap-2 px-4 py-1.5 border-b border-border/40 mt-1">
                {#if group.color}
                  <span class="text-xs font-medium text-white rounded px-1.5 py-0.5" style="background:{group.color}">{group.label}</span>
                {:else}
                  <span class="text-xs font-semibold text-gray-400">{group.label}</span>
                {/if}
                <span class="text-xs text-gray-600">{group.tasks.length}</span>
                {#if group.isDone && group.tasks.length > 0}
                  {#if confirmArchiveAllDone === group.key}
                    <span class="text-xs text-gray-500">Archive all?</span>
                    <button class="text-xs text-yellow-400 hover:text-yellow-300" onclick={archiveAllDone}>Yes</button>
                    <button class="text-xs text-gray-500 hover:text-gray-300" onclick={() => (confirmArchiveAllDone = null)}>No</button>
                  {:else}
                    <button class="text-xs text-gray-600 hover:text-gray-400 ml-1" onclick={() => (confirmArchiveAllDone = group.key)}>Archive all</button>
                  {/if}
                {/if}
              </div>

              <!-- Tasks -->
              {#each group.tasks as task (task._id)}
                <TaskCard
                  {task}
                  {tasks}
                  {statusConfig}
                  selected={$selectedTaskId === task._id}
                  onclick={() => ($selectedTaskId = task._id)}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                />
              {/each}

              <!-- Inline add task -->
              {#if inlineAddGroup === group.key}
                <!-- svelte-ignore a11y_autofocus -->
                <input
                  class="w-full bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none px-4 pl-9 py-1 border-b border-border/40"
                  placeholder="Task title, then Enter…"
                  bind:value={inlineAddTitle}
                  autofocus
                  onkeydown={async e => {
                    if (e.key === "Enter") {
                      const status = groupBy === "status" ? group.key : newTaskStatus
                      await createQuickTask(inlineAddTitle, status)
                      inlineAddTitle = ""
                    }
                    if (e.key === "Escape") {
                      inlineAddGroup = null
                      inlineAddTitle = ""
                    }
                  }}
                  onblur={() => {
                    inlineAddGroup = null
                    inlineAddTitle = ""
                  }}
                />
              {:else}
                <button
                  class="text-xs text-gray-600 hover:text-gray-400 px-4 pl-9 py-1 w-full text-left border-b border-border/40 transition-colors"
                  onclick={() => { inlineAddGroup = group.key; inlineAddTitle = "" }}
                >+ Add task</button>
              {/if}
            {/if}
          {/each}
        </div>
      {:else if $viewMode === "board"}
        <BoardView
          tasks={filteredTasks}
          allTasks={tasks}
          {statusConfig}
          selectedTaskId={$selectedTaskId}
          onTaskClick={id => ($selectedTaskId = id)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onArchiveAllDone={archiveAllDone}
          onCreateTask={createQuickTask}
        />
      {:else}
        <!-- Map view -->
        {#if browser}
          {#await import("$lib/components/MindMap.svelte") then { default: MindMap }}
            <MindMap
              {tasks}
              {list}
              {statusConfig}
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
        <select
          id="new-task-status"
          class="text-xs bg-surface border border-border rounded px-2 py-1 text-gray-300"
          bind:value={newTaskStatus}
        >
          {#each statusConfig as s (s.id)}
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
{#if overlayTask ?? selectedTask}
  <TaskDetail
    task={(overlayTask ?? selectedTask)!}
    {tasks}
    {statusConfig}
    {allTags}
    currentListId={data.list._id}
    currentListStatusConfig={statusConfig}
    lists={data.lists}
    onUpdate={updateTask}
    onDelete={deleteTask}
    onCreateSubtask={createSubtask}
    onClose={() => {
      $selectedTaskId = null
      overlayTask = null
    }}
  />
{/if}
