<script lang="ts">
  import { goto } from "$app/navigation"
  import { page } from "$app/stores"
  import HeroIcon from "$lib/components/HeroIcon.svelte"
  import SearchModal from "$lib/components/SearchModal.svelte"
  import SettingsModal from "$lib/components/SettingsModal.svelte"
  import { ICON_NAMES, DEFAULT_ICON } from "$lib/icons"
  import { showSearch, sidebarOpen } from "$lib/stores/ui"
  import type { List, StatusConfig } from "$lib/types"
  import { setContext, untrack } from "svelte"

  let { data, children } = $props()

  let lists = $state<List[]>(untrack(() => data.lists))
  let showNewList = $state(false)
  let showSettings = $state(false)
  let statusConfig = $state<StatusConfig[]>(untrack(() => data.statusConfig))
  let editingList = $state<List | null>(null)
  let editName = $state("")
  let editColor = $state("")
  let editIcon = $state("")

  $effect(() => {
    statusConfig = data.statusConfig
  })

  setContext("statusConfig", { get: () => statusConfig })

  function onGlobalKeyDown(e: KeyboardEvent) {
    if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      showSearch.update(v => !v)
    }
  }
  let newListName = $state("")
  let newListColor = $state("#6366f1")
  let newListIcon = $state(DEFAULT_ICON)

  // Update lists when data changes
  $effect(() => {
    lists = data.lists
  })

  const listColors = ["#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#84cc16", "#f59e0b", "#f97316", "#ef4444", "#ec4899", "#8b5cf6", "#a855f7", "#6b7280"]

  async function createList() {
    if (!newListName.trim()) return
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName, color: newListColor, icon: newListIcon }),
    })
    const list = await res.json()
    lists = [...lists, list]
    showNewList = false
    newListName = ""
    goto(`/${list._id}`)
  }

  function startEdit(list: List) {
    editingList = list
    editName = list.name
    editColor = list.color
    editIcon = list.icon
  }

  async function saveEdit() {
    if (!editingList || !editName.trim()) return
    const res = await fetch(`/api/lists/${editingList._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), color: editColor, icon: editIcon }),
    })
    const updated = await res.json()
    lists = lists.map(l => (l._id === updated._id ? updated : l))
    editingList = null
  }

  let dragIndex = $state<number | null>(null)
  let insertIndex = $state<number | null>(null)

  function onDragStart(e: DragEvent, idx: number) {
    dragIndex = idx
    e.dataTransfer!.effectAllowed = "move"
  }

  function onDragOver(e: DragEvent, idx: number) {
    e.preventDefault()
    e.dataTransfer!.dropEffect = "move"
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    insertIndex = e.clientY < rect.top + rect.height / 2 ? idx : idx + 1
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    if (dragIndex === null || insertIndex === null) return
    if (insertIndex === dragIndex || insertIndex === dragIndex + 1) {
      dragIndex = null
      insertIndex = null
      return
    }
    const newLists = [...lists]
    const [moved] = newLists.splice(dragIndex, 1)
    newLists.splice(insertIndex > dragIndex ? insertIndex - 1 : insertIndex, 0, moved)
    lists = newLists.map((l, i) => ({ ...l, order: i }))
    dragIndex = null
    insertIndex = null
    Promise.all(lists.map((l, i) =>
      fetch(`/api/lists/${l._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: i }),
      })
    ))
  }

  function onDragEnd() {
    dragIndex = null
    insertIndex = null
  }

  async function logout() {
    await fetch("/auth/logout", { method: "POST" })
    goto("/auth/login")
  }
</script>

<svelte:window onkeydown={onGlobalKeyDown} />

<div class="flex h-screen overflow-hidden">
  <!-- Mobile backdrop -->
  {#if $sidebarOpen}
    <div
      class="fixed inset-0 bg-black/60 z-20 lg:hidden"
      onclick={() => sidebarOpen.set(false)}
      role="presentation"
    ></div>
  {/if}

  <!-- Sidebar -->
  <aside
    class="
      fixed lg:relative inset-y-0 left-0 z-30 lg:z-auto
      flex flex-col flex-shrink-0
      bg-sidebar border-r border-border
      transition-all duration-200
      {$sidebarOpen ? 'w-60 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-14'}
    "
  >
    <!-- Logo -->
    <div class="p-3 border-b border-border flex items-center {$sidebarOpen ? 'gap-2' : 'justify-center'} min-h-[53px]">
      <img src="/images/logo.png" alt="tickd" class="h-6 w-auto flex-shrink-0" />
      {#if $sidebarOpen}
        <span class="font-bold text-lg tracking-tight">tickd</span>
      {/if}
    </div>

    <!-- Lists -->
    <nav class="flex-1 overflow-y-auto p-2">
      {#if $sidebarOpen}
        <div class="flex items-center justify-between px-2 py-1 mb-1">
          <span class="text-xs text-gray-500 uppercase tracking-wider">Lists</span>
          <button
            class="text-gray-500 hover:text-gray-100 text-lg leading-none"
            onclick={() => (showNewList = true)}
            title="New list">+</button
          >
        </div>
      {/if}

      {#each lists as list, i (list._id)}
        {#if dragIndex !== null && insertIndex === i}
          <div class="h-0.5 bg-accent rounded mx-1 my-0.5 pointer-events-none"></div>
        {/if}
        <div
          class="relative group {dragIndex === i ? 'opacity-40' : ''}"
          draggable="true"
          ondragstart={e => onDragStart(e, i)}
          ondragover={e => onDragOver(e, i)}
          ondrop={onDrop}
          ondragend={onDragEnd}
        >
          <a
            href="/{list._id}"
            class="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-white/5 transition-colors {$page.params
              .listId === list._id
              ? 'bg-white/10 text-white'
              : 'text-gray-400'} {$sidebarOpen ? 'pr-8' : 'justify-center px-0'}"
            title={$sidebarOpen ? undefined : list.name}
            onclick={() => {
              if (window.innerWidth < 1024) {
                sidebarOpen.set(false)
              } else if (!$sidebarOpen) {
                sidebarOpen.set(true)
              }
            }}
          >
            <HeroIcon name={list.icon} class="w-4 h-4 flex-shrink-0" style="color:{list.color}" />
            {#if $sidebarOpen}
              <span class="flex-1 truncate">{list.name}</span>
            {/if}
          </a>
          {#if $sidebarOpen}
            <div class="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center bg-sidebar rounded px-0.5">
              <button
                class="p-0.5 text-gray-500 hover:text-gray-200 transition-colors"
                onclick={e => { e.preventDefault(); startEdit(list) }}
                title="Edit list"
                aria-label="Edit list"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3">
                  <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474ZM4.75 14.25h6.5a.75.75 0 0 0 0-1.5h-6.5a.75.75 0 0 0 0 1.5Z" />
                </svg>
              </button>
            </div>
          {/if}
        </div>
      {/each}
      {#if dragIndex !== null && insertIndex === lists.length}
        <div class="h-0.5 bg-accent rounded mx-1 my-0.5 pointer-events-none"></div>
      {/if}

      {#if !$sidebarOpen}
        <button
          class="w-full flex justify-center py-1.5 text-gray-500 hover:text-gray-100 text-lg leading-none"
          onclick={() => (showNewList = true)}
          title="New list">+</button
        >
      {/if}
    </nav>

    <!-- User -->
    <div class="p-3 border-t border-border">
      {#if $sidebarOpen}
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-medium flex-shrink-0">
            {data.user.displayName?.[0]?.toUpperCase() ?? "U"}
          </div>
          <span class="text-sm text-gray-300 flex-1 truncate">{data.user.displayName}</span>
          <button
            class="text-gray-500 hover:text-gray-100 transition-colors"
            onclick={() => (showSettings = true)}
            title="Settings"
            aria-label="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.993 6.993 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clip-rule="evenodd" />
            </svg>
          </button>
          <button class="text-gray-500 hover:text-gray-100 text-xs" onclick={logout}>Sign out</button>
        </div>
      {:else}
        <div class="flex flex-col items-center gap-1">
          <div
            class="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-medium cursor-pointer"
            title={data.user.displayName}
          >
            {data.user.displayName?.[0]?.toUpperCase() ?? "U"}
          </div>
          <button
            class="text-gray-500 hover:text-gray-100 transition-colors"
            onclick={() => (showSettings = true)}
            title="Settings"
            aria-label="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.993 6.993 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      {/if}
    </div>

    <!-- Collapse/expand toggle -->
    <button
      class="hidden lg:flex absolute -right-3 top-[34px] w-6 h-6 bg-sidebar border border-border rounded-full items-center justify-center text-gray-400 hover:text-gray-100 hover:bg-surface transition-colors z-10"
      onclick={() => sidebarOpen.update(v => !v)}
      title={$sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      aria-label={$sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        class="w-3 h-3 transition-transform duration-200 {$sidebarOpen ? '' : 'rotate-180'}"
      >
        <path
          fill-rule="evenodd"
          d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z"
          clip-rule="evenodd"
        />
      </svg>
    </button>
  </aside>

  <!-- Main -->
  <main class="flex-1 overflow-hidden flex flex-col min-w-0">
    <!-- Mobile header -->
    <div class="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
      <button
        class="text-gray-400 hover:text-gray-100 transition-colors"
        onclick={() => sidebarOpen.update(v => !v)}
        aria-label="Toggle menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
          <path
            fill-rule="evenodd"
            d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
      <img src="/images/logo.png" alt="tickd" class="h-5 w-auto" />
      <span class="font-bold tracking-tight">tickd</span>
      <button
        class="ml-auto text-gray-400 hover:text-gray-100 transition-colors"
        onclick={() => showSearch.set(true)}
        aria-label="Search tasks"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
          <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>

    <div class="flex-1 overflow-hidden">
      {@render children()}
    </div>
  </main>
</div>

<!-- New List Modal -->
{#if showNewList}
  <div
    class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
    onclick={() => (showNewList = false)}
    onkeydown={e => e.key === "Escape" && (showNewList = false)}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="card w-full max-w-sm" onclick={e => e.stopPropagation()} role="presentation">
      <h2 class="font-semibold mb-4">New List</h2>
      <div class="space-y-3">
        <input
          class="input"
          placeholder="List name"
          bind:value={newListName}
          onkeydown={e => e.key === "Enter" && createList()}
        />
        <div>
          <span class="text-xs text-gray-400 block mb-1">Color</span>
          <div class="flex gap-2 flex-wrap">
            {#each listColors as c}
              <button
                class="w-6 h-6 rounded-full border-2 transition-all {newListColor === c
                  ? 'border-white scale-110'
                  : 'border-transparent'}"
                style="background:{c}"
                aria-label="Select color {c}"
                onclick={() => (newListColor = c)}
              ></button>
            {/each}
          </div>
        </div>
        <div>
          <span class="text-xs text-gray-400 block mb-1">Icon</span>
          <div class="grid grid-cols-7 gap-1">
            {#each ICON_NAMES as i}
              <button
                class="p-1.5 rounded flex items-center justify-center {newListIcon === i ? 'bg-white/20' : 'hover:bg-white/10'}"
                onclick={() => (newListIcon = i)}
                title={i}
              >
                <HeroIcon name={i} class="w-5 h-5" style="color:{newListColor}" />
              </button>
            {/each}
          </div>
        </div>
        <div class="flex gap-2 justify-end pt-2">
          <button class="btn-ghost" onclick={() => (showNewList = false)}>Cancel</button>
          <button class="btn-primary" onclick={createList}>Create</button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if $showSearch}
  <SearchModal
    currentListId={$page.params.listId ?? null}
    {lists}
    onClose={() => showSearch.set(false)}
  />
{/if}

{#if editingList}
  <div
    class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
    onclick={() => (editingList = null)}
    onkeydown={e => e.key === "Escape" && (editingList = null)}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="card w-full max-w-sm" onclick={e => e.stopPropagation()} role="presentation">
      <h2 class="font-semibold mb-4">Edit List</h2>
      <div class="space-y-3">
        <input
          class="input"
          placeholder="List name"
          bind:value={editName}
          onkeydown={e => e.key === "Enter" && saveEdit()}
        />
        <div>
          <span class="text-xs text-gray-400 block mb-1">Color</span>
          <div class="flex gap-2 flex-wrap">
            {#each listColors as c}
              <button
                class="w-6 h-6 rounded-full border-2 transition-all {editColor === c ? 'border-white scale-110' : 'border-transparent'}"
                style="background:{c}"
                aria-label="Select color {c}"
                onclick={() => (editColor = c)}
              ></button>
            {/each}
          </div>
        </div>
        <div>
          <span class="text-xs text-gray-400 block mb-1">Icon</span>
          <div class="grid grid-cols-7 gap-1">
            {#each ICON_NAMES as i}
              <button
                class="p-1.5 rounded flex items-center justify-center {editIcon === i ? 'bg-white/20' : 'hover:bg-white/10'}"
                onclick={() => (editIcon = i)}
                title={i}
              >
                <HeroIcon name={i} class="w-5 h-5" style="color:{editColor}" />
              </button>
            {/each}
          </div>
        </div>
        <div class="flex gap-2 justify-end pt-2">
          <button class="btn-ghost" onclick={() => (editingList = null)}>Cancel</button>
          <button class="btn-primary" onclick={saveEdit}>Save</button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if showSettings}
  <SettingsModal
    {statusConfig}
    onClose={() => (showSettings = false)}
    onStatusConfigUpdated={updated => (statusConfig = updated)}
  />
{/if}
