<script lang="ts">
  import { goto } from "$app/navigation"
  import { page } from "$app/stores"
  import { sidebarOpen } from "$lib/stores/ui"
  import type { List } from "$lib/types"
  import { untrack } from "svelte"

  let { data, children } = $props()

  let lists = $state<List[]>(untrack(() => data.lists))
  let showNewList = $state(false)
  let newListName = $state("")
  let newListColor = $state("#6366f1")
  let newListIcon = $state("📋")

  // Update lists when data changes
  $effect(() => {
    lists = data.lists
  })

  const listColors = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6"]
  const listIcons = ["📋", "📌", "🏠", "💼", "🎮", "❤️", "⭐", "🚀", "📚", "🎯"]

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

  async function logout() {
    await fetch("/auth/logout", { method: "POST" })
    goto("/auth/login")
  }
</script>

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

      {#each lists as list (list._id)}
        <a
          href="/{list._id}"
          class="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-white/5 transition-colors {$page.params
            .listId === list._id
            ? 'bg-white/10 text-white'
            : 'text-gray-400'} {$sidebarOpen ? '' : 'justify-center px-0'}"
          title={$sidebarOpen ? undefined : list.name}
        >
          <span class="text-base leading-none">{list.icon}</span>
          {#if $sidebarOpen}
            <span class="flex-1 truncate">{list.name}</span>
            <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:{list.color}"></span>
          {/if}
        </a>
      {/each}

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
          <button class="text-gray-500 hover:text-gray-100 text-xs" onclick={logout}>Sign out</button>
        </div>
      {:else}
        <div class="flex justify-center">
          <div
            class="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-medium cursor-pointer"
            title={data.user.displayName}
          >
            {data.user.displayName?.[0]?.toUpperCase() ?? "U"}
          </div>
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
          <div class="flex gap-2 flex-wrap">
            {#each listIcons as i}
              <button
                class="text-lg p-1 rounded {newListIcon === i ? 'bg-white/20' : 'hover:bg-white/10'}"
                onclick={() => (newListIcon = i)}>{i}</button
              >
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
