<script lang="ts">
  import type { StatusConfig } from "$lib/types"

  let {
    statusConfig,
    onClose,
    onStatusConfigUpdated,
  }: {
    statusConfig: StatusConfig[]
    onClose: () => void
    onStatusConfigUpdated: (updated: StatusConfig[]) => void
  } = $props()

  const STATUS_COLORS = [
    "#888888",
    "#3b82f6",
    "#f59e0b",
    "#10b981",
    "#ef4444",
    "#ec4899",
    "#8b5cf6",
    "#6366f1",
    "#14b8a6",
    "#f97316",
  ]

  // Local copy we edit before saving
  let localStatuses = $state<StatusConfig[]>(statusConfig.map(s => ({ ...s })))
  let colorPickerFor = $state<string | null>(null)
  let confirmDeleteId = $state<string | null>(null)

  async function save(updated: StatusConfig[]) {
    // Reassign order values
    const reordered = updated.map((s, i) => ({ ...s, order: i }))
    localStatuses = reordered
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusConfig: reordered }),
    })
    if (res.ok) {
      onStatusConfigUpdated(reordered)
    }
  }

  async function deleteStatus(statusId: string) {
    confirmDeleteId = null
    const res = await fetch("/api/settings/delete-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusId }),
    })
    if (res.ok) {
      const data = await res.json()
      localStatuses = data.statusConfig
      onStatusConfigUpdated(data.statusConfig)
    }
  }

  function moveUp(index: number) {
    if (index <= 1) return // can't move above backlog (index 0)
    const updated = [...localStatuses]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    save(updated)
  }

  function moveDown(index: number) {
    if (index >= localStatuses.length - 2) return // can't move below done (last index)
    const updated = [...localStatuses]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    save(updated)
  }

  function addStatus() {
    const newStatus: StatusConfig = {
      id: crypto.randomUUID(),
      name: "New Status",
      color: STATUS_COLORS[Math.floor(Math.random() * STATUS_COLORS.length)],
      isDone: false,
      order: localStatuses.length - 1,
    }
    // Insert before the last (Done) status
    const updated = [
      ...localStatuses.slice(0, localStatuses.length - 1),
      newStatus,
      localStatuses[localStatuses.length - 1],
    ]
    save(updated)
  }

  function onNameBlur(index: number) {
    save([...localStatuses])
  }

  function setColor(index: number, color: string) {
    localStatuses[index] = { ...localStatuses[index], color }
    colorPickerFor = null
    save([...localStatuses])
  }

  function isEdge(index: number) {
    return index === 0 || index === localStatuses.length - 1
  }
</script>

<div
  class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
  onclick={onClose}
  onkeydown={e => e.key === "Escape" && onClose()}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <div
    class="card w-full max-w-md flex flex-col max-h-[80vh]"
    onclick={e => e.stopPropagation()}
    role="presentation"
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-4 flex-shrink-0">
      <h2 class="font-semibold">Settings</h2>
      <button
        class="text-gray-500 hover:text-gray-100 transition-colors text-lg leading-none"
        onclick={onClose}
        aria-label="Close"
      >×</button>
    </div>

    <!-- Statuses section -->
    <div class="flex-1 overflow-y-auto min-h-0">
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs text-gray-400 uppercase tracking-wider">Statuses</span>
        <button
          class="text-xs text-gray-400 hover:text-gray-100 transition-colors border border-border rounded px-2 py-0.5"
          onclick={addStatus}
        >+ Add</button>
      </div>

      <div class="space-y-1">
        {#each localStatuses as status, index (status.id)}
          <div class="flex items-center gap-2 group py-1">
            <!-- Color swatch -->
            <div class="relative flex-shrink-0">
              <button
                class="w-5 h-5 rounded-full border-2 border-white/20 hover:border-white/50 transition-colors flex-shrink-0"
                style="background:{status.color}"
                onclick={() => (colorPickerFor = colorPickerFor === status.id ? null : status.id)}
                title="Change color"
              ></button>
              {#if colorPickerFor === status.id}
                <div
                  class="absolute left-0 top-7 z-50 bg-gray-900 border border-white/10 rounded shadow-xl p-2 flex flex-wrap gap-1.5"
                  style="width: 148px"
                >
                  {#each STATUS_COLORS as c}
                    <button
                      class="w-6 h-6 rounded-full border-2 transition-all {status.color === c
                        ? 'border-white scale-110'
                        : 'border-transparent hover:border-white/40'}"
                      style="background:{c}"
                      onclick={() => setColor(index, c)}
                      aria-label="Select color {c}"
                    ></button>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Name input -->
            <input
              class="flex-1 bg-transparent text-sm text-gray-200 outline-none border-b border-transparent focus:border-border transition-colors py-0.5 min-w-0"
              bind:value={status.name}
              onblur={() => onNameBlur(index)}
              onkeydown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              disabled={false}
            />

            <!-- Lock indicator for edge statuses -->
            {#if isEdge(index)}
              <span class="text-xs text-gray-600 flex-shrink-0" title="{index === 0 ? 'Always first' : 'Always last'}">
                {index === 0 ? "first" : "last"}
              </span>
            {:else}
              <!-- Reorder buttons -->
              <div class="flex flex-col gap-0 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  class="text-gray-500 hover:text-gray-100 leading-none text-xs px-1 disabled:opacity-30"
                  onclick={() => moveUp(index)}
                  disabled={index <= 1}
                  title="Move up"
                >▲</button>
                <button
                  class="text-gray-500 hover:text-gray-100 leading-none text-xs px-1 disabled:opacity-30"
                  onclick={() => moveDown(index)}
                  disabled={index >= localStatuses.length - 2}
                  title="Move down"
                >▼</button>
              </div>

              <!-- Delete -->
              {#if confirmDeleteId === status.id}
                <span class="flex items-center gap-1 flex-shrink-0">
                  <button
                    class="text-xs text-red-400 hover:text-red-300"
                    onclick={() => deleteStatus(status.id)}
                  >Delete</button>
                  <button
                    class="text-xs text-gray-500 hover:text-gray-300"
                    onclick={() => (confirmDeleteId = null)}
                  >Cancel</button>
                </span>
              {:else}
                <button
                  class="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-opacity flex-shrink-0"
                  onclick={() => (confirmDeleteId = status.id)}
                  title="Delete status"
                >×</button>
              {/if}
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<!-- Close color picker on outside click -->
{#if colorPickerFor}
  <div
    class="fixed inset-0 z-40"
    onclick={() => (colorPickerFor = null)}
    onkeydown={e => e.key === "Escape" && (colorPickerFor = null)}
    role="presentation"
  ></div>
{/if}
