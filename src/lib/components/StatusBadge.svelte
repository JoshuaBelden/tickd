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
  class="inline-flex items-center gap-1 text-xs rounded px-2 py-0.5"
  style="background:{info?.color}22;color:{info?.color}"
>
  {info?.name ?? status}
</span>
