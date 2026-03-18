<script lang="ts">
  import { browser } from "$app/environment"
  import type { ChecklistItem, StatusConfig, Task } from "$lib/types"
  import { formatDate } from "$lib/utils"
  import { nanoid } from "nanoid"

  let {
    task,
    tasks,
    statusConfig,
    allTags,
    onUpdate,
    onDelete,
    onCreateSubtask,
    onClose,
  }: {
    task: Task
    tasks: Task[]
    statusConfig: StatusConfig[]
    allTags: string[]
    onUpdate: (id: string, updates: Partial<Task>) => Promise<void>
    onDelete: (id: string) => Promise<void>
    onCreateSubtask: (parentId: string, title: string) => Promise<void>
    onClose: () => void
  } = $props()

  let editingTitle = $state(false)
  let titleValue = $state(task.title)
  let newSubtaskTitle = $state("")
  let newTagInput = $state("")
  let tagSuggestions = $state<string[]>([])
  let newChecklistItem = $state("")

  $effect(() => {
    titleValue = task.title
  })

  const subtasks = $derived(tasks.filter(t => t.parentId === task._id))
  const statusInfo = $derived(statusConfig.find(s => s.id === task.status))

  async function saveTitle() {
    if (titleValue.trim() && titleValue !== task.title) {
      await onUpdate(task._id, { title: titleValue.trim() })
    }
    editingTitle = false
  }

  async function addChecklistItem() {
    if (!newChecklistItem.trim()) return
    const item: ChecklistItem = { id: nanoid(), label: newChecklistItem.trim(), checked: false }
    await onUpdate(task._id, { checklist: [...(task.checklist ?? []), item] })
    newChecklistItem = ""
  }

  async function toggleChecklistItem(itemId: string) {
    const updated = (task.checklist ?? []).map(c => (c.id === itemId ? { ...c, checked: !c.checked } : c))
    await onUpdate(task._id, { checklist: updated })
  }

  async function removeChecklistItem(itemId: string) {
    await onUpdate(task._id, { checklist: (task.checklist ?? []).filter(c => c.id !== itemId) })
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
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="bg-sidebar border border-border flex flex-col overflow-hidden w-full h-full sm:w-4/5 sm:h-4/5 sm:rounded-lg"
    onclick={e => e.stopPropagation()}
  >
  <!-- Header -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
    <span class="text-xs text-gray-500">Task</span>
    <button class="text-gray-500 hover:text-gray-100 text-lg leading-none" onclick={onClose}>×</button>
  </div>

  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    <!-- Title -->
    {#if editingTitle}
      <input
        class="input text-base font-medium"
        bind:value={titleValue}
        onblur={saveTitle}
        onkeydown={e => e.key === "Enter" && saveTitle()}
        autofocus
      />
    {:else}
      <h2
        class="text-base font-medium cursor-text hover:bg-white/5 rounded px-1 py-0.5 -mx-1"
        onclick={() => (editingTitle = true)}
        role="button"
        tabindex="0"
      >
        {task.title}
      </h2>
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
      <label class="text-xs text-gray-500 block mb-1.5">Tags</label>
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
      <label class="text-xs text-gray-500 block mb-1.5">Description</label>
      {#if browser}
        {#await import("$lib/components/RichTextEditor.svelte") then { default: RichTextEditor }}
          <RichTextEditor
            content={task.description}
            onChange={content => onUpdate(task._id, { description: content })}
          />
        {/await}
      {/if}
    </div>

    <!-- Checklist -->
    <div>
      <div class="flex items-center justify-between mb-1.5">
        <label class="text-xs text-gray-500">Checklist</label>
        {#if task.checklist?.length > 0}
          <span class="text-xs text-gray-500"
            >{task.checklist.filter(c => c.checked).length}/{task.checklist.length}</span
          >
        {/if}
      </div>

      <div class="space-y-1 mb-2">
        {#each task.checklist ?? [] as item (item.id)}
          <div class="flex items-center gap-2 group">
            <input
              type="checkbox"
              class="accent-accent"
              checked={item.checked}
              onchange={() => toggleChecklistItem(item.id)}
            />
            <span class="flex-1 text-sm {item.checked ? 'line-through text-gray-500' : ''}">{item.label}</span>
            <button
              class="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs"
              onclick={() => removeChecklistItem(item.id)}>×</button
            >
          </div>
        {/each}
      </div>

      <input
        class="input text-xs"
        placeholder="Add checklist item..."
        bind:value={newChecklistItem}
        onkeydown={e => e.key === "Enter" && addChecklistItem()}
      />
    </div>

    <!-- Subtasks -->
    <div>
      <label class="text-xs text-gray-500 block mb-1.5">Subtasks</label>
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
  <div class="px-4 py-3 border-t border-border flex-shrink-0 flex items-center justify-between">
    <span class="text-xs text-gray-600">Created {formatDate(task.createdAt)}</span>
    <button class="text-xs text-red-500 hover:text-red-400" onclick={() => onDelete(task._id)}>Delete</button>
  </div>
  </div>
</div>
