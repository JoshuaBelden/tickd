<script lang="ts">
  import type { StatusConfig } from "$lib/types"

  let {
    status,
    statusConfig,
  }: {
    status: string
    statusConfig: StatusConfig[]
  } = $props()

  const info = $derived(statusConfig.find(s => s.id === status))
</script>

<span
  class="inline-flex items-center text-xs font-medium text-white rounded px-2 py-0.5"
  style="background:{info?.color ?? '#888'}"
>
  {info?.name ?? status}
</span>
