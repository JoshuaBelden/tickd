<script lang="ts">
  import { browser } from "$app/environment"
  import { untrack } from "svelte"
  import type { Checklist, ChecklistItem, List, StatusConfig, Task } from "$lib/types"
  import { formatDate } from "$lib/utils"
  import { nanoid } from "nanoid"

  let {
    task,
    tasks,
    statusConfig,
    allTags,
    currentListId,
    currentListStatusConfig,
    lists,
    onUpdate,
    onDelete,
    onCreateSubtask,
    onClose,
  }: {
    task: Task
    tasks: Task[]
    statusConfig: StatusConfig[]
    allTags: string[]
    currentListId: string
    currentListStatusConfig: StatusConfig[]
    lists: List[]
    onUpdate: (id: string, updates: Partial<Task>) => Promise<void>
    onDelete: (id: string) => Promise<void>
    onCreateSubtask: (parentId: string, title: string) => Promise<void>
    onClose: () => void
  } = $props()

  let editingTitle = $state(false)
  let titleValue = $state(untrack(() => task.title))
  let newSubtaskTitle = $state("")
  let newTagInput = $state("")
  let tagSuggestions = $state<string[]>([])
  let showCompletedMap = $state<Record<string, boolean>>({})
  let newItemMap = $state<Record<string, string>>({})
  let editingChecklistId = $state<string | null>(null)
  let editingChecklistTitle = $state("")
  let confirmDeleteChecklistId = $state<string | null>(null)
  let confirmDeleteTask = $state(false)
  let confirmArchiveTask = $state(false)
  let showMoveList = $state(false)

  $effect(() => {
    titleValue = task.title
  })

  const effectiveChecklists = $derived(
    task.checklists && task.checklists.length > 0
      ? task.checklists
      : task.checklist && task.checklist.length > 0
        ? [{ id: "legacy", title: "Checklist", items: task.checklist }]
        : [],
  )

  $effect(() => {
    if (!browser) return
    const cls = effectiveChecklists
    const map: Record<string, boolean> = {}
    for (const cl of cls) {
      map[cl.id] = localStorage.getItem(`show-done-${cl.id}`) === "true"
    }
    showCompletedMap = map
  })

  const subtasks = $derived(tasks.filter(t => t.parentId === task._id))
  const statusInfo = $derived(statusConfig.find(s => s.id === task.status))

  async function saveTitle() {
    if (titleValue.trim() && titleValue !== task.title) {
      await onUpdate(task._id, { title: titleValue.trim() })
    }
    editingTitle = false
  }

  async function saveChecklistTitle(checklistId: string) {
    const title = editingChecklistTitle.trim()
    if (title) {
      const updated = effectiveChecklists.map(cl => (cl.id === checklistId ? { ...cl, title } : cl))
      await onUpdate(task._id, { checklists: updated, checklist: [] })
    }
    editingChecklistId = null
  }

  async function deleteChecklist(checklistId: string) {
    const updated = effectiveChecklists.filter(cl => cl.id !== checklistId)
    await onUpdate(task._id, { checklists: updated, checklist: [] })
    confirmDeleteChecklistId = null
  }

  async function addChecklist() {
    const title = `Checklist ${effectiveChecklists.length + 1}`
    const newCl: Checklist = { id: nanoid(), title, items: [] }
    await onUpdate(task._id, { checklists: [...effectiveChecklists, newCl], checklist: [] })
  }

  async function addChecklistItem(checklistId: string) {
    const label = (newItemMap[checklistId] ?? "").trim()
    if (!label) return
    const newItem: ChecklistItem = { id: nanoid(), label, checked: false }
    const updated = effectiveChecklists.map(cl =>
      cl.id === checklistId ? { ...cl, items: [...cl.items, newItem] } : cl,
    )
    await onUpdate(task._id, { checklists: updated, checklist: [] })
    newItemMap = { ...newItemMap, [checklistId]: "" }
  }

  async function toggleChecklistItem(checklistId: string, itemId: string) {
    const updated = effectiveChecklists.map(cl =>
      cl.id === checklistId
        ? { ...cl, items: cl.items.map(item => (item.id === itemId ? { ...item, checked: !item.checked } : item)) }
        : cl,
    )
    await onUpdate(task._id, { checklists: updated, checklist: [] })
  }

  async function removeChecklistItem(checklistId: string, itemId: string) {
    const updated = effectiveChecklists.map(cl =>
      cl.id === checklistId ? { ...cl, items: cl.items.filter(item => item.id !== itemId) } : cl,
    )
    await onUpdate(task._id, { checklists: updated, checklist: [] })
  }

  function toggleShowCompleted(checklistId: string) {
    const next = !(showCompletedMap[checklistId] ?? false)
    showCompletedMap = { ...showCompletedMap, [checklistId]: next }
    if (browser) localStorage.setItem(`show-done-${checklistId}`, String(next))
  }

  async function addTag(tag: string) {
    if (!tag.trim() || task.tags.includes(tag)) return
    await onUpdate(task._id, { tags: [...task.tags, tag.trim()] })
    newTagInput = ""
    tagSuggestions = []
  }

  async function removeTag(tag: string) {
    await onUpdate(task._id, { tags: task.tags.filter(t => t !== tag) })
  }

  function onTagInput() {
    if (newTagInput.trim().length > 0) {
      tagSuggestions = allTags
        .filter(t => t.toLowerCase().includes(newTagInput.toLowerCase()) && !task.tags.includes(t))
        .slice(0, 5)
    } else {
      tagSuggestions = []
    }
  }

  async function addSubtask() {
    if (!newSubtaskTitle.trim()) return
    await onCreateSubtask(task._id, newSubtaskTitle.trim())
    newSubtaskTitle = ""
  }

  const priorities = ["none", "low", "medium", "high", "urgent"] as const
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50"
  onclick={onClose}
  onkeydown={e => e.key === "Escape" && onClose()}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <div
    class="bg-sidebar border border-border flex flex-col overflow-hidden w-full h-full sm:w-4/5 sm:h-4/5 sm:rounded-lg"
    onclick={e => e.stopPropagation()}
    onkeydown={e => e.stopPropagation()}
    role="presentation"
  >
  <!-- Header -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
    <span class="text-xs text-gray-500">Task</span>
    <button class="text-gray-500 hover:text-gray-100 text-lg leading-none" onclick={onClose}>×</button>
  </div>

  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    <!-- Title -->
    {#if editingTitle}
      <!-- svelte-ignore a11y_autofocus -->
      <input
        class="input text-base font-medium"
        bind:value={titleValue}
        onblur={saveTitle}
        onkeydown={e => e.key === "Enter" && saveTitle()}
        autofocus
      />
    {:else}
      <button
        class="text-base font-medium text-left w-full cursor-text hover:bg-white/5 rounded px-1 py-0.5 -mx-1"
        onclick={() => (editingTitle = true)}
      >
        {task.title}
      </button>
    {/if}

    <!-- Status & Priority row -->
    <div class="flex items-center gap-2 flex-wrap">
      <select
        class="text-xs bg-surface border border-border rounded px-2 py-1 text-gray-300"
        value={task.status}
        onchange={e => onUpdate(task._id, { status: (e.target as HTMLSelectElement).value })}
      >
        {#each statusConfig as s (s.id)}
          <option value={s.id} style="color:{s.color}">{s.name}</option>
        {/each}
      </select>

      <select
        class="text-xs bg-surface border border-border rounded px-2 py-1 text-gray-300"
        value={task.priority}
        onchange={e => onUpdate(task._id, { priority: (e.target as HTMLSelectElement).value as any })}
      >
        {#each priorities as p}
          <option value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
        {/each}
      </select>

      <input
        type="date"
        class="text-xs bg-surface border border-border rounded px-2 py-1 text-gray-300"
        value={task.dueDate ? task.dueDate.split("T")[0] : ""}
        onchange={e => onUpdate(task._id, { dueDate: (e.target as HTMLInputElement).value || null })}
      />
    </div>

    <!-- Tags -->
    <div>
      <span class="text-xs text-gray-500 block mb-1.5">Tags</span>
      <div class="flex flex-wrap gap-1 mb-1.5">
        {#each task.tags as tag}
          <span class="inline-flex items-center gap-1 text-xs bg-white/10 rounded px-2 py-0.5">
            {tag}
            <button class="text-gray-500 hover:text-gray-100" onclick={() => removeTag(tag)}>×</button>
          </span>
        {/each}
      </div>
      <div class="relative">
        <input
          class="input text-xs"
          placeholder="Add tag..."
          bind:value={newTagInput}
          oninput={onTagInput}
          onkeydown={e => {
            if (e.key === "Enter") addTag(newTagInput)
          }}
        />
        {#if tagSuggestions.length > 0}
          <div class="absolute z-10 top-full left-0 right-0 bg-surface border border-border rounded mt-0.5">
            {#each tagSuggestions as s}
              <button class="block w-full text-left text-xs px-3 py-1.5 hover:bg-white/5" onclick={() => addTag(s)}
                >{s}</button
              >
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Description -->
    <div>
      <span class="text-xs text-gray-500 block mb-1.5">Description</span>
      {#if browser}
        {#await import("$lib/components/RichTextEditor.svelte") then { default: RichTextEditor }}
          <RichTextEditor
            content={task.description}
            onChange={content => onUpdate(task._id, { description: content })}
          />
        {/await}
      {/if}
    </div>

    <!-- Checklists -->
    <div class="space-y-4">
      {#each effectiveChecklists as checklist (checklist.id)}
        {@const doneCount = checklist.items.filter(i => i.checked).length}
        {@const totalCount = checklist.items.length}
        {@const showDone = showCompletedMap[checklist.id] ?? false}
        <div>
          <div class="flex items-center justify-between mb-1.5">
            {#if editingChecklistId === checklist.id}
              <!-- svelte-ignore a11y_autofocus -->
              <input
                class="input text-xs flex-1 mr-2"
                value={editingChecklistTitle}
                oninput={e => (editingChecklistTitle = (e.target as HTMLInputElement).value)}
                onblur={() => saveChecklistTitle(checklist.id)}
                onkeydown={e => {
                  if (e.key === "Enter") saveChecklistTitle(checklist.id)
                  if (e.key === "Escape") editingChecklistId = null
                }}
                autofocus
              />
            {:else}
              <span
                class="text-xs text-gray-500 cursor-text hover:text-gray-300"
                onclick={() => {
                  editingChecklistId = checklist.id
                  editingChecklistTitle = checklist.title
                }}
                onkeydown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    editingChecklistId = checklist.id
                    editingChecklistTitle = checklist.title
                  }
                }}
                role="button"
                tabindex="0">{checklist.title}</span
              >
            {/if}
            <div class="flex items-center gap-2">
              {#if totalCount > 0}
                <span class="text-xs text-gray-500">{doneCount}/{totalCount}</span>
              {/if}
              {#if confirmDeleteChecklistId === checklist.id}
                <span class="text-xs text-gray-400">Delete?</span>
                <button
                  class="text-xs text-red-400 hover:text-red-300"
                  onclick={() => deleteChecklist(checklist.id)}>Yes</button
                >
                <button
                  class="text-xs text-gray-500 hover:text-gray-300"
                  onclick={() => (confirmDeleteChecklistId = null)}>No</button
                >
              {:else}
                <button
                  class="text-xs text-gray-600 hover:text-red-400"
                  onclick={() => (confirmDeleteChecklistId = checklist.id)}
                  title="Delete checklist">Delete</button
                >
              {/if}
            </div>
          </div>

          <div class="space-y-1 mb-2">
            {#each checklist.items.filter(i => !i.checked || showDone) as item (item.id)}
              <div class="flex items-center gap-2 group">
                <input
                  type="checkbox"
                  class="accent-accent"
                  checked={item.checked}
                  onchange={() => toggleChecklistItem(checklist.id, item.id)}
                />
                <span class="flex-1 text-sm {item.checked ? 'line-through text-gray-500' : ''}">{item.label}</span>
                <button
                  class="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs"
                  onclick={() => removeChecklistItem(checklist.id, item.id)}>×</button
                >
              </div>
            {/each}
          </div>

          {#if doneCount > 0}
            <button
              class="text-xs text-gray-500 hover:text-gray-300 mb-2 block"
              onclick={() => toggleShowCompleted(checklist.id)}
            >
              {showDone ? "Hide" : "Show"} {doneCount} completed item{doneCount !== 1 ? "s" : ""}
            </button>
          {/if}

          <input
            class="input text-xs"
            placeholder="Add item..."
            value={newItemMap[checklist.id] ?? ""}
            oninput={e => {
              newItemMap = { ...newItemMap, [checklist.id]: (e.target as HTMLInputElement).value }
            }}
            onkeydown={e => e.key === "Enter" && addChecklistItem(checklist.id)}
          />
        </div>
      {/each}

      <button class="text-xs text-gray-500 hover:text-gray-300" onclick={addChecklist}>+ Add checklist</button>
    </div>

    <!-- Subtasks -->
    <div>
      <span class="text-xs text-gray-500 block mb-1.5">Subtasks</span>
      <div class="space-y-0.5 mb-2">
        {#each subtasks as subtask (subtask._id)}
          <div class="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 text-sm">
            <span class="w-3 h-3 rounded-full border border-gray-600 flex-shrink-0"></span>
            <span class={statusConfig.find(s => s.id === subtask.status)?.isDone ? "line-through text-gray-500" : ""}
              >{subtask.title}</span
            >
          </div>
        {/each}
      </div>
      <div class="flex gap-2">
        <input
          class="input text-xs flex-1"
          placeholder="Add subtask..."
          bind:value={newSubtaskTitle}
          onkeydown={e => e.key === "Enter" && addSubtask()}
        />
        <button class="btn-ghost text-xs" onclick={addSubtask}>Add</button>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="px-4 py-3 border-t border-border flex-shrink-0 flex items-center justify-between gap-4">
    <span class="text-xs text-gray-600">Created {formatDate(task.createdAt)}</span>
    <div class="flex items-center gap-3">
      {#if showMoveList}
        <span class="flex items-center gap-1.5">
          <select
            class="text-xs bg-surface border border-border rounded px-2 py-1 text-gray-300"
            value={currentListId}
            onchange={async e => {
              const newListId = (e.target as HTMLSelectElement).value
              if (newListId !== currentListId) {
                showMoveList = false
                await onUpdate(task._id, { listId: newListId })
              } else {
                showMoveList = false
              }
            }}
          >
            {#each lists as l (l._id)}
              <option value={l._id}>{l.name}</option>
            {/each}
          </select>
          <button class="text-xs text-gray-500 hover:text-gray-300" onclick={() => (showMoveList = false)}>Cancel</button>
        </span>
      {:else}
        <button class="text-xs text-gray-500 hover:text-gray-300" onclick={() => (showMoveList = true)}>Move to list</button>
      {/if}
      {#if task.archivedAt !== null}
        <button
          class="text-xs text-gray-400 hover:text-gray-100"
          onclick={() => onUpdate(task._id, { archivedAt: null, listId: currentListId, status: currentListStatusConfig[0]?.id ?? task.status })}
        >Unarchive to this list</button>
      {:else if confirmArchiveTask}
        <span class="flex items-center gap-2">
          <span class="text-xs text-gray-500">Archive this task?</span>
          <button class="text-xs text-yellow-400 hover:text-yellow-300" onclick={() => { confirmArchiveTask = false; onUpdate(task._id, { archivedAt: new Date().toISOString() }) }}>Yes</button>
          <button class="text-xs text-gray-500 hover:text-gray-300" onclick={() => confirmArchiveTask = false}>No</button>
        </span>
      {:else}
        <button class="text-xs text-gray-500 hover:text-gray-300" onclick={() => confirmArchiveTask = true}>Archive</button>
      {/if}
      {#if confirmDeleteTask}
        <span class="flex items-center gap-2">
          <span class="text-xs text-gray-500">Delete this task?</span>
          <button class="text-xs text-red-400 hover:text-red-300" onclick={() => onDelete(task._id)}>Yes, delete</button>
          <button class="text-xs text-gray-500 hover:text-gray-300" onclick={() => confirmDeleteTask = false}>Cancel</button>
        </span>
      {:else}
        <button class="text-xs text-red-500 hover:text-red-400" onclick={() => confirmDeleteTask = true}>Delete</button>
      {/if}
    </div>
  </div>
  </div>
</div>
