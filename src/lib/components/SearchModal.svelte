<script lang="ts">
  import { goto } from "$app/navigation"
  import { selectedTaskId } from "$lib/stores/ui"
  import type { List, TaskSearchResult } from "$lib/types"

  let {
    currentListId,
    lists,
    onClose,
  }: {
    currentListId: string | null
    lists: List[]
    onClose: () => void
  } = $props()

  let query = $state("")
  let searchAllLists = $state(false)
  let includeArchived = $state(false)
  let results = $state<TaskSearchResult[]>([])
  let activeIndex = $state(-1)
  let loading = $state(false)

  let inputEl = $state<HTMLInputElement | null>(null)

  $effect(() => {
    inputEl?.focus()
  })

  $effect(() => {
    const q = query.trim()
    // Track toggle dependencies
    const _all = searchAllLists
    const _arch = includeArchived

    if (!q) {
      results = []
      activeIndex = -1
      loading = false
      return
    }

    loading = true
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q })
        if (!_all && currentListId) params.set("listId", currentListId)
        if (_arch) params.set("archived", "true")
        const res = await fetch(`/api/tasks/search?${params}`)
        results = await res.json()
        activeIndex = results.length > 0 ? 0 : -1
      } finally {
        loading = false
      }
    }, 200)

    return () => clearTimeout(timer)
  })

  // Scroll active result into view
  let resultEls = $state<(HTMLButtonElement | null)[]>([])
  $effect(() => {
    if (activeIndex >= 0) resultEls[activeIndex]?.scrollIntoView({ block: "nearest" })
  })

  function selectResult(result: TaskSearchResult) {
    onClose()
    if (result.archivedAt !== null) {
      // Archived: always open in current list so user can unarchive to it
      const targetListId = currentListId ?? lists[0]?._id
      if (targetListId) goto(`/${targetListId}?task=${result._id}`)
    } else if (result.listId === currentListId) {
      $selectedTaskId = result._id
    } else {
      goto(`/${result.listId}?task=${result._id}`)
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      activeIndex = Math.min(activeIndex + 1, results.length - 1)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      activeIndex = Math.max(activeIndex - 1, 0)
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault()
      selectResult(results[activeIndex])
    } else if (e.key === "Escape") {
      onClose()
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="fixed inset-0 bg-black/60 flex items-start justify-center z-50 pt-20 px-4"
  onclick={onClose}
  onkeydown={e => e.key === "Escape" && onClose()}
  role="dialog"
  aria-modal="true"
  aria-label="Search tasks"
  tabindex="-1"
>
  <div
    class="bg-sidebar border border-border rounded-lg w-full max-w-lg shadow-xl flex flex-col overflow-hidden max-h-[70vh]"
    onclick={e => e.stopPropagation()}
    onkeydown={e => e.stopPropagation()}
    role="presentation"
  >
    <!-- Search input -->
    <div class="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-500 flex-shrink-0">
        <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" />
      </svg>
      <input
        bind:this={inputEl}
        class="flex-1 bg-transparent outline-none text-sm text-gray-100 placeholder-gray-600"
        placeholder="Search tasks..."
        bind:value={query}
        onkeydown={onKeyDown}
      />
      {#if loading}
        <span class="text-xs text-gray-600">...</span>
      {/if}
    </div>

    <!-- Toggles -->
    <div class="flex items-center gap-4 px-4 py-2 border-b border-border flex-shrink-0">
      <label class="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
        <input type="checkbox" class="accent-accent" bind:checked={searchAllLists} />
        All lists
      </label>
      <label class="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
        <input type="checkbox" class="accent-accent" bind:checked={includeArchived} />
        Include archived
      </label>
    </div>

    <!-- Results -->
    <div class="overflow-y-auto flex-1">
      {#if results.length === 0 && query.trim() && !loading}
        <div class="px-4 py-6 text-xs text-gray-600 text-center">No results</div>
      {:else}
        {#each results as result, i (result._id)}
          <button
            bind:this={resultEls[i]}
            class="w-full text-left px-4 py-3 border-b border-border/50 last:border-0 transition-colors
              {i === activeIndex ? 'bg-white/10' : 'hover:bg-white/5'}"
            onclick={() => selectResult(result)}
          >
            <div class="flex items-center gap-2 mb-1">
              <span class="text-sm">{result.listIcon}</span>
              <span class="text-xs text-gray-500 flex-1 truncate {result.listDeleted ? 'line-through' : ''}">{result.listName}</span>
              {#if result.archivedAt}
                <span class="text-xs text-yellow-600/80 bg-yellow-500/10 rounded px-1.5 py-0.5">archived</span>
              {/if}
            </div>
            <div class="text-sm text-gray-100 leading-snug mb-1 pl-6">{result.title}</div>
            {#if result.tags.length > 0}
              <div class="flex flex-wrap gap-1 pl-6">
                {#each result.tags.slice(0, 4) as tag}
                  <span class="text-xs text-gray-500 bg-white/5 rounded px-1.5 py-0.5">{tag}</span>
                {/each}
              </div>
            {/if}
          </button>
        {/each}
      {/if}
    </div>

    <!-- Hint -->
    {#if results.length > 0}
      <div class="px-4 py-2 border-t border-border flex-shrink-0 flex items-center gap-3 text-xs text-gray-600">
        <span>↑↓ navigate</span>
        <span>↵ open</span>
        <span>esc close</span>
      </div>
    {/if}
  </div>
</div>
