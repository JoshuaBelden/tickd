<script lang="ts">
  import { HEROICON_PATHS, DEFAULT_ICON } from "$lib/icons"

  let { name, class: className = "", style = "" }: { name: string; class?: string; style?: string } = $props()

  const paths = $derived(HEROICON_PATHS[name] ?? HEROICON_PATHS[DEFAULT_ICON])
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
  {style}
>
  {#each paths as d}
    <path {d} />
  {/each}
</svg>
