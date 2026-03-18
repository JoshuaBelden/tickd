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
  <!-- Sidebar -->
  {#if $sidebarOpen}
    <aside class="w-60 flex-shrink-0 bg-sidebar border-r border-border flex flex-col">
      <!-- Logo -->
      <div class="p-4 border-b border-border">
        <div class="flex items-center gap-2">
          <img src="/images/logo.png" alt="" class="h-6 w-auto" />
          <span class="font-bold text-lg tracking-tight">tickd</span>
        </div>
      </div>

      <!-- Lists -->
      <nav class="flex-1 overflow-y-auto p-2">
        <div class="flex items-center justify-between px-2 py-1 mb-1">
          <span class="text-xs text-gray-500 uppercase tracking-wider">Lists</span>
          <button
            class="text-gray-500 hover:text-gray-100 text-lg leading-none"
            onclick={() => (showNewList = true)}
            title="New list">+</button
          >
        </div>

        {#each lists as list (list._id)}
          <a
            href="/{list._id}"
            class="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-white/5 transition-colors {$page.params
              .listId === list._id
              ? 'bg-white/10 text-white'
              : 'text-gray-400'}"
          >
            <span>{list.icon}</span>
            <span class="flex-1 truncate">{list.name}</span>
            <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:{list.color}"></span>
          </a>
        {/each}
      </nav>

      <!-- User -->
      <div class="p-3 border-t border-border">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-medium">
            {data.user.displayName?.[0]?.toUpperCase() ?? "U"}
          </div>
          <span class="text-sm text-gray-300 flex-1 truncate">{data.user.displayName}</span>
          <button class="text-gray-500 hover:text-gray-100 text-xs" onclick={logout}>Sign out</button>
        </div>
      </div>
    </aside>
  {/if}

  <!-- Main -->
  <main class="flex-1 overflow-hidden">
    {@render children()}
  </main>
</div>

<!-- New List Modal -->
{#if showNewList}
  <div
    class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
    onclick={() => (showNewList = false)}
    onkeydown={e => e.key === "Escape" && (showNewList = false)}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="card w-80" onclick={e => e.stopPropagation()} role="presentation">
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
