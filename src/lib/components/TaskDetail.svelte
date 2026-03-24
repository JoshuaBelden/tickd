<script lang="ts">
  import { browser } from "$app/environment"
  import { getContext, untrack } from "svelte"
  import type { Checklist, ChecklistItem, List, StatusConfig, Tag, Task } from "$lib/types"
  import { TAG_COLORS } from "$lib/types"
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
    allTags: Tag[]
    currentListId: string
    currentListStatusConfig: StatusConfig[]
    lists: List[]
    onUpdate: (id: string, updates: Partial<Task>) => Promise<void>
    onDelete: (id: string) => Promise<void>
    onCreateSubtask: (parentId: string, title: string) => Promise<void>
    onClose: () => void
  } = $props()

  const tagsCtx = getContext<{ get: () => Tag[]; set: (t: Tag[]) => void }>("tags")

  // Navigation stack: push subtask IDs to drill into them in-place
  let navStack = $state<string[]>([])

  const activeTask = $derived(
    navStack.length > 0
      ? (tasks.find(t => t._id === navStack[navStack.length - 1]) ?? task)
      : task
  )
  const activeSubtasks = $derived(tasks.filter(t => t.parentId === activeTask._id))
  let confirmDeleteSubtaskId = $state<string | null>(null)

  let editingTitle = $state(false)
  let titleValue = $state(untrack(() => task.title))
  let newSubtaskTitle = $state("")
  let newTagInput = $state("")
  let tagSuggestions = $state<Tag[]>([])
  let tagMenuOpen = $state<string | null>(null)
  let tagRenaming = $state<string | null>(null)
  let tagRenameValue = $state("")
  let tagColorPickerFor = $state<string | null>(null)
  let confirmDeleteTagId = $state<string | null>(null)
  let showCompletedMap = $state<Record<string, boolean>>({})
  let newItemMap = $state<Record<string, string>>({})
  let editingChecklistId = $state<string | null>(null)
  let editingChecklistTitle = $state("")
  let editingItemKey = $state<string | null>(null)
  let editingItemLabel = $state("")
  let confirmDeleteChecklistId = $state<string | null>(null)
  let clDragIndex = $state<Record<string, number | null>>({})
  let clInsertIndex = $state<Record<string, number | null>>({})
  let confirmDeleteTask = $state(false)
  let confirmArchiveTask = $state(false)
  let showMoveList = $state(false)

  // Reset stack when root task prop changes
  $effect(() => {
    task
    navStack = []
  })

  // Prune stack if tasks are deleted externally
  $effect(() => {
    const valid = navStack.filter(id => tasks.some(t => t._id === id))
    if (valid.length !== navStack.length) navStack = valid
  })

  $effect(() => {
    titleValue = activeTask.title
  })

  const effectiveChecklists = $derived(
    activeTask.checklists && activeTask.checklists.length > 0
      ? activeTask.checklists
      : activeTask.checklist && activeTask.checklist.length > 0
        ? [{ id: "legacy", title: "Checklist", items: activeTask.checklist }]
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

  const statusInfo = $derived(statusConfig.find(s => s.id === activeTask.status))

  async function saveTitle() {
    if (titleValue.trim() && titleValue !== activeTask.title) {
      await onUpdate(activeTask._id, { title: titleValue.trim() })
    }
    editingTitle = false
  }

  async function saveItemLabel(checklistId: string, itemId: string) {
    const label = editingItemLabel.trim()
    if (label) {
      const updated = effectiveChecklists.map(cl =>
        cl.id === checklistId
          ? { ...cl, items: cl.items.map(it => (it.id === itemId ? { ...it, label } : it)) }
          : cl,
      )
      await onUpdate(activeTask._id, { checklists: updated, checklist: [] })
    }
    editingItemKey = null
  }

  async function saveChecklistTitle(checklistId: string) {
    const title = editingChecklistTitle.trim()
    if (title) {
      const updated = effectiveChecklists.map(cl => (cl.id === checklistId ? { ...cl, title } : cl))
      await onUpdate(activeTask._id, { checklists: updated, checklist: [] })
    }
    editingChecklistId = null
  }

  async function deleteChecklist(checklistId: string) {
    const updated = effectiveChecklists.filter(cl => cl.id !== checklistId)
    await onUpdate(activeTask._id, { checklists: updated, checklist: [] })
    confirmDeleteChecklistId = null
  }

  async function addChecklist() {
    const title = `Checklist ${effectiveChecklists.length + 1}`
    const newCl: Checklist = { id: nanoid(), title, items: [] }
    await onUpdate(activeTask._id, { checklists: [...effectiveChecklists, newCl], checklist: [] })
  }

  async function addChecklistItem(checklistId: string) {
    const label = (newItemMap[checklistId] ?? "").trim()
    if (!label) return
    const newItem: ChecklistItem = { id: nanoid(), label, checked: false }
    const updated = effectiveChecklists.map(cl =>
      cl.id === checklistId ? { ...cl, items: [...cl.items, newItem] } : cl,
    )
    await onUpdate(activeTask._id, { checklists: updated, checklist: [] })
    newItemMap = { ...newItemMap, [checklistId]: "" }
  }

  async function toggleChecklistItem(checklistId: string, itemId: string) {
    const updated = effectiveChecklists.map(cl =>
      cl.id === checklistId
        ? { ...cl, items: cl.items.map(item => (item.id === itemId ? { ...item, checked: !item.checked } : item)) }
        : cl,
    )
    await onUpdate(activeTask._id, { checklists: updated, checklist: [] })
  }

  async function removeChecklistItem(checklistId: string, itemId: string) {
    const updated = effectiveChecklists.map(cl =>
      cl.id === checklistId ? { ...cl, items: cl.items.filter(item => item.id !== itemId) } : cl,
    )
    await onUpdate(activeTask._id, { checklists: updated, checklist: [] })
  }

  function itemDragStart(e: DragEvent, checklistId: string, itemIndex: number) {
    clDragIndex = { ...clDragIndex, [checklistId]: itemIndex }
    e.dataTransfer!.effectAllowed = "move"
  }

  function itemDragOver(e: DragEvent, checklistId: string, itemIndex: number) {
    e.preventDefault()
    e.dataTransfer!.dropEffect = "move"
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    clInsertIndex = {
      ...clInsertIndex,
      [checklistId]: e.clientY < rect.top + rect.height / 2 ? itemIndex : itemIndex + 1,
    }
  }

  async function itemDrop(e: DragEvent, checklistId: string) {
    e.preventDefault()
    const dragIdx = clDragIndex[checklistId]
    const insertIdx = clInsertIndex[checklistId]
    if (dragIdx === null || dragIdx === undefined || insertIdx === null || insertIdx === undefined) return
    if (insertIdx === dragIdx || insertIdx === dragIdx + 1) {
      clDragIndex = { ...clDragIndex, [checklistId]: null }
      clInsertIndex = { ...clInsertIndex, [checklistId]: null }
      return
    }
    const cl = effectiveChecklists.find(c => c.id === checklistId)
    if (!cl) return
    const newItems = [...cl.items]
    const [moved] = newItems.splice(dragIdx, 1)
    newItems.splice(insertIdx > dragIdx ? insertIdx - 1 : insertIdx, 0, moved)
    const updated = effectiveChecklists.map(c => (c.id === checklistId ? { ...c, items: newItems } : c))
    await onUpdate(activeTask._id, { checklists: updated, checklist: [] })
    clDragIndex = { ...clDragIndex, [checklistId]: null }
    clInsertIndex = { ...clInsertIndex, [checklistId]: null }
  }

  function itemDragEnd(checklistId: string) {
    clDragIndex = { ...clDragIndex, [checklistId]: null }
    clInsertIndex = { ...clInsertIndex, [checklistId]: null }
  }

  function toggleShowCompleted(checklistId: string) {
    const next = !(showCompletedMap[checklistId] ?? false)
    showCompletedMap = { ...showCompletedMap, [checklistId]: next }
    if (browser) localStorage.setItem(`show-done-${checklistId}`, String(next))
  }

  async function addTagById(tagId: string) {
    if (activeTask.tags.includes(tagId)) return
    await onUpdate(activeTask._id, { tags: [...activeTask.tags, tagId] })
    newTagInput = ""
    tagSuggestions = []
  }

  async function createAndAddTag(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed, color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)] }),
    })
    if (res.status === 409) {
      // Tag already exists — get it from allTags
      const existing = allTags.find(t => t.name.toLowerCase() === trimmed.toLowerCase())
      if (existing) await addTagById(existing._id)
      return
    }
    if (!res.ok) return
    const newTag: Tag = await res.json()
    tagsCtx.set([...tagsCtx.get(), newTag].sort((a, b) => a.name.localeCompare(b.name)))
    await addTagById(newTag._id)
  }

  async function removeTagFromTask(tagId: string) {
    await onUpdate(activeTask._id, { tags: activeTask.tags.filter(t => t !== tagId) })
    tagMenuOpen = null
  }

  async function renameTag(tagId: string) {
    const name = tagRenameValue.trim()
    if (!name) { tagRenaming = null; return }
    const res = await fetch(`/api/tags/${tagId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const updated: Tag = await res.json()
      tagsCtx.set(tagsCtx.get().map(t => t._id === tagId ? updated : t))
    }
    tagRenaming = null
    tagMenuOpen = null
  }

  async function setTagColor(tagId: string, color: string) {
    const res = await fetch(`/api/tags/${tagId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    })
    if (res.ok) {
      const updated: Tag = await res.json()
      tagsCtx.set(tagsCtx.get().map(t => t._id === tagId ? updated : t))
    }
    tagColorPickerFor = null
    tagMenuOpen = null
  }

  async function deleteTagGlobally(tagId: string) {
    await fetch(`/api/tags/${tagId}`, { method: "DELETE" })
    tagsCtx.set(tagsCtx.get().filter(t => t._id !== tagId))
    await onUpdate(activeTask._id, { tags: activeTask.tags.filter(t => t !== tagId) })
    confirmDeleteTagId = null
    tagMenuOpen = null
  }

  function onTagInput() {
    if (newTagInput.trim().length > 0) {
      tagSuggestions = allTags
        .filter(t => t.name.toLowerCase().includes(newTagInput.toLowerCase()) && !activeTask.tags.includes(t._id))
        .slice(0, 5)
    } else {
      tagSuggestions = []
    }
  }

  async function onTagEnter() {
    const trimmed = newTagInput.trim()
    if (!trimmed) return
    const exact = allTags.find(t => t.name.toLowerCase() === trimmed.toLowerCase())
    if (exact) {
      await addTagById(exact._id)
    } else {
      await createAndAddTag(trimmed)
    }
  }

  async function addSubtask() {
    if (!newSubtaskTitle.trim()) return
    await onCreateSubtask(activeTask._id, newSubtaskTitle.trim())
    newSubtaskTitle = ""
  }

  function navigateToSubtask(id: string) {
    navStack = [...navStack, id]
    editingTitle = false
    confirmDeleteTask = false
    confirmArchiveTask = false
    confirmDeleteSubtaskId = null
  }

  function navigateBack() {
    navStack = navStack.slice(0, -1)
  }

  async function handleDeleteActive() {
    const idToDelete = activeTask._id
    if (navStack.length > 0) navigateBack()
    await onDelete(idToDelete)
    confirmDeleteTask = false
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
    <div class="flex items-center gap-1 text-xs text-gray-500 min-w-0">
      {#if navStack.length > 0}
        <button class="hover:text-gray-200 flex-shrink-0 mr-1" onclick={navigateBack}>‹</button>
        <button class="hover:text-gray-300 truncate max-w-[120px]" onclick={() => (navStack = [])}>{task.title}</button>
        {#each navStack.slice(0, -1) as stackId}
          {@const st = tasks.find(t => t._id === stackId)}
          {#if st}
            <span class="flex-shrink-0 mx-0.5">›</span>
            <button class="hover:text-gray-300 truncate max-w-[80px]" onclick={() => (navStack = navStack.slice(0, navStack.indexOf(stackId) + 1))}>{st.title}</button>
          {/if}
        {/each}
        <span class="flex-shrink-0 mx-0.5">›</span>
        <span class="text-gray-300 truncate max-w-[120px]">{activeTask.title}</span>
      {:else if task.parentId}
        {@const parentTask = tasks.find(t => t._id === task.parentId)}
        {#if parentTask}
          <span class="truncate max-w-[120px]">{parentTask.title}</span>
          <span class="mx-0.5">›</span>
          <span class="text-gray-300 truncate max-w-[120px]">{task.title}</span>
        {:else}
          <span>Task</span>
        {/if}
      {:else}
        <span>Task</span>
      {/if}
    </div>
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
        {activeTask.title}
      </button>
    {/if}

    <!-- Status & Priority row -->
    <div class="flex items-center gap-2 flex-wrap">
      <select
        class="text-xs bg-surface border border-border rounded px-2 py-1 text-gray-300"
        value={activeTask.status}
        onchange={e => onUpdate(activeTask._id, { status: (e.target as HTMLSelectElement).value })}
      >
        {#each statusConfig as s (s.id)}
          <option value={s.id} style="color:{s.color}">{s.name}</option>
        {/each}
      </select>

      <select
        class="text-xs bg-surface border border-border rounded px-2 py-1 text-gray-300"
        value={activeTask.priority}
        onchange={e => onUpdate(activeTask._id, { priority: (e.target as HTMLSelectElement).value as any })}
      >
        {#each priorities as p}
          <option value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
        {/each}
      </select>

      <input
        type="date"
        class="text-xs bg-surface border border-border rounded px-2 py-1 text-gray-300"
        value={activeTask.dueDate ? activeTask.dueDate.split("T")[0] : ""}
        onchange={e => onUpdate(activeTask._id, { dueDate: (e.target as HTMLInputElement).value || null })}
      />
    </div>

    <!-- Tags -->
    <div>
      <span class="text-xs text-gray-500 block mb-1.5">Tags</span>
      <div class="flex flex-wrap gap-1 mb-1.5">
        {#each activeTask.tags as tagId}
          {@const tagObj = allTags.find(t => t._id === tagId)}
          {#if tagObj}
            <span
              class="relative inline-flex items-center gap-1 text-xs rounded px-2 py-0.5 group/tag"
              style="background-color: {tagObj.color}25; color: {tagObj.color}; border: 1px solid {tagObj.color}50"
            >
              {#if tagRenaming === tagId}
                <!-- svelte-ignore a11y_autofocus -->
                <input
                  class="bg-transparent outline-none w-20 text-xs"
                  bind:value={tagRenameValue}
                  onblur={() => renameTag(tagId)}
                  onkeydown={e => { if (e.key === "Enter") renameTag(tagId); if (e.key === "Escape") { tagRenaming = null; tagMenuOpen = null } }}
                  autofocus
                />
              {:else}
                {tagObj.name}
              {/if}
              <button
                class="opacity-0 group-hover/tag:opacity-100 transition-opacity text-xs leading-none"
                onclick={e => { e.stopPropagation(); tagMenuOpen = tagMenuOpen === tagId ? null : tagId; confirmDeleteTagId = null; tagColorPickerFor = null }}
                title="Tag options"
              >···</button>
              <button
                class="opacity-0 group-hover/tag:opacity-100 transition-opacity text-xs leading-none"
                onclick={() => removeTagFromTask(tagId)}
                title="Remove from task"
              >×</button>
              {#if tagMenuOpen === tagId}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <div
                  class="absolute left-0 top-full mt-0.5 z-50 bg-gray-900 border border-white/10 rounded shadow-xl py-1 min-w-36"
                  onclick={e => e.stopPropagation()}
                  role="menu"
                  tabindex="-1"
                >
                  {#if tagColorPickerFor === tagId}
                    <div class="px-3 py-2">
                      <div class="flex flex-wrap gap-1.5">
                        {#each TAG_COLORS as c}
                          <button
                            class="w-5 h-5 rounded-full border-2 transition-all {tagObj.color === c ? 'border-white scale-110' : 'border-transparent'}"
                            style="background:{c}"
                            onclick={() => setTagColor(tagId, c)}
                            aria-label="Select color {c}"
                          ></button>
                        {/each}
                      </div>
                      <button class="text-xs text-gray-500 hover:text-gray-300 mt-2" onclick={() => tagColorPickerFor = null}>Back</button>
                    </div>
                  {:else}
                    <button
                      class="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-white/10"
                      onclick={() => { tagRenaming = tagId; tagRenameValue = tagObj.name; tagMenuOpen = null }}
                    >Rename</button>
                    <button
                      class="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-white/10"
                      onclick={() => tagColorPickerFor = tagId}
                    >Change color</button>
                    <button
                      class="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-white/10"
                      onclick={() => removeTagFromTask(tagId)}
                    >Remove from task</button>
                    <div class="border-t border-white/10 my-1"></div>
                    {#if confirmDeleteTagId === tagId}
                      <div class="flex items-center gap-2 px-3 py-1.5">
                        <span class="text-xs text-gray-400">Delete everywhere?</span>
                        <button class="text-xs text-red-400 hover:text-red-300" onclick={() => deleteTagGlobally(tagId)}>Yes</button>
                        <button class="text-xs text-gray-500" onclick={() => confirmDeleteTagId = null}>No</button>
                      </div>
                    {:else}
                      <button
                        class="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-white/10"
                        onclick={() => confirmDeleteTagId = tagId}
                      >Delete tag...</button>
                    {/if}
                  {/if}
                </div>
                <div class="fixed inset-0 z-40" onclick={() => { tagMenuOpen = null; tagColorPickerFor = null; confirmDeleteTagId = null }} role="presentation"></div>
              {/if}
            </span>
          {/if}
        {/each}
      </div>
      <div class="relative">
        <input
          class="input text-xs"
          placeholder="Add tag..."
          bind:value={newTagInput}
          oninput={onTagInput}
          onkeydown={e => { if (e.key === "Enter") onTagEnter() }}
        />
        {#if tagSuggestions.length > 0 || (newTagInput.trim() && !allTags.find(t => t.name.toLowerCase() === newTagInput.trim().toLowerCase()))}
          <div class="absolute z-10 top-full left-0 right-0 bg-surface border border-border rounded mt-0.5">
            {#each tagSuggestions as t}
              <button
                class="flex items-center gap-2 w-full text-left text-xs px-3 py-1.5 hover:bg-white/5"
                onclick={() => addTagById(t._id)}
              >
                <span class="w-3 h-3 rounded-full flex-shrink-0" style="background:{t.color}"></span>
                {t.name}
              </button>
            {/each}
            {#if newTagInput.trim() && !allTags.find(t => t.name.toLowerCase() === newTagInput.trim().toLowerCase())}
              <button
                class="flex items-center gap-2 w-full text-left text-xs px-3 py-1.5 hover:bg-white/5 text-gray-400"
                onclick={() => createAndAddTag(newTagInput)}
              >
                <span class="text-gray-500">+</span> Create "{newTagInput.trim()}"
              </button>
            {/if}
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
            content={activeTask.description}
            onChange={content => onUpdate(activeTask._id, { description: content })}
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
        {@const visibleItems = checklist.items.map((item, idx) => ({ item, idx })).filter(({ item }) => !item.checked || showDone)}
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

          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="space-y-1 mb-2"
            ondragover={e => e.preventDefault()}
            ondrop={e => itemDrop(e, checklist.id)}
            role="listbox"
            aria-label="{checklist.title} items"
            tabindex="-1"
          >
            {#each visibleItems as { item, idx } (item.id)}
              {#if clDragIndex[checklist.id] !== null && clInsertIndex[checklist.id] === idx}
                <div class="h-0.5 bg-accent rounded pointer-events-none my-0.5"></div>
              {/if}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="flex items-center gap-2 group {clDragIndex[checklist.id] === idx ? 'opacity-40' : ''}"
                draggable="true"
                ondragstart={e => itemDragStart(e, checklist.id, idx)}
                ondragover={e => itemDragOver(e, checklist.id, idx)}
                ondragend={() => itemDragEnd(checklist.id)}
                role="option"
                aria-selected="false"
                tabindex="0"
              >
                <span class="cursor-grab text-gray-600 opacity-0 group-hover:opacity-100 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                    <path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM15 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM15 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM15 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
                  </svg>
                </span>
                <input
                  type="checkbox"
                  class="accent-accent"
                  checked={item.checked}
                  onchange={() => toggleChecklistItem(checklist.id, item.id)}
                />
                {#if editingItemKey === `${checklist.id}:${item.id}`}
                  <input
                    class="flex-1 text-sm bg-transparent outline-none border-b border-gray-500"
                    value={editingItemLabel}
                    oninput={e => (editingItemLabel = (e.target as HTMLInputElement).value)}
                    onblur={() => saveItemLabel(checklist.id, item.id)}
                    onkeydown={e => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                      if (e.key === "Escape") editingItemKey = null
                    }}
                    autofocus
                  />
                {:else}
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <span
                    class="flex-1 text-sm cursor-pointer {item.checked ? 'line-through text-gray-500' : ''}"
                    ondblclick={() => {
                      editingItemKey = `${checklist.id}:${item.id}`
                      editingItemLabel = item.label
                    }}
                  >{item.label}</span>
                {/if}
                <button
                  class="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs"
                  onclick={() => removeChecklistItem(checklist.id, item.id)}>×</button
                >
              </div>
            {/each}
            {#if clDragIndex[checklist.id] !== null && clInsertIndex[checklist.id] === checklist.items.length}
              <div class="h-0.5 bg-accent rounded pointer-events-none my-0.5"></div>
            {/if}
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
        {#each activeSubtasks as subtask (subtask._id)}
          <div class="group flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 text-sm">
            <span
              class="w-3 h-3 rounded-full flex-shrink-0"
              style="background:{statusConfig.find(s => s.id === subtask.status)?.color ?? '#888'}"
            ></span>
            <button
              class="flex-1 text-left truncate hover:text-gray-100 {statusConfig.find(s => s.id === subtask.status)?.isDone ? 'line-through text-gray-500' : ''}"
              onclick={() => navigateToSubtask(subtask._id)}
            >{subtask.title}</button>
            {#if confirmDeleteSubtaskId === subtask._id}
              <span class="flex items-center gap-1 flex-shrink-0">
                <span class="text-xs text-gray-500">Delete?</span>
                <button class="text-xs text-red-400 hover:text-red-300" onclick={() => { onDelete(subtask._id); confirmDeleteSubtaskId = null }}>Yes</button>
                <button class="text-xs text-gray-500 hover:text-gray-300" onclick={() => confirmDeleteSubtaskId = null}>No</button>
              </span>
            {:else}
              <button
                class="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-opacity flex-shrink-0"
                onclick={() => confirmDeleteSubtaskId = subtask._id}
                title="Delete subtask"
              >×</button>
            {/if}
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
    <span class="text-xs text-gray-600">Created {formatDate(activeTask.createdAt)}</span>
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
                await onUpdate(activeTask._id, { listId: newListId })
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
      {#if activeTask.archivedAt !== null}
        <button
          class="text-xs text-gray-400 hover:text-gray-100"
          onclick={() => onUpdate(activeTask._id, { archivedAt: null, listId: currentListId, status: currentListStatusConfig[0]?.id ?? activeTask.status })}
        >Unarchive to this list</button>
      {:else if confirmArchiveTask}
        <span class="flex items-center gap-2">
          <span class="text-xs text-gray-500">Archive this task?</span>
          <button class="text-xs text-yellow-400 hover:text-yellow-300" onclick={() => { confirmArchiveTask = false; onUpdate(activeTask._id, { archivedAt: new Date().toISOString() }) }}>Yes</button>
          <button class="text-xs text-gray-500 hover:text-gray-300" onclick={() => confirmArchiveTask = false}>No</button>
        </span>
      {:else}
        <button class="text-xs text-gray-500 hover:text-gray-300" onclick={() => confirmArchiveTask = true}>Archive</button>
      {/if}
      {#if confirmDeleteTask}
        <span class="flex items-center gap-2">
          <span class="text-xs text-gray-500">Delete this task?</span>
          <button class="text-xs text-red-400 hover:text-red-300" onclick={() => handleDeleteActive()}>Yes, delete</button>
          <button class="text-xs text-gray-500 hover:text-gray-300" onclick={() => confirmDeleteTask = false}>Cancel</button>
        </span>
      {:else}
        <button class="text-xs text-red-500 hover:text-red-400" onclick={() => confirmDeleteTask = true}>Delete</button>
      {/if}
    </div>
  </div>
  </div>
</div>
