<script lang="ts">
  import { Editor } from "@tiptap/core"
  import Link from "@tiptap/extension-link"
  import Placeholder from "@tiptap/extension-placeholder"
  import StarterKit from "@tiptap/starter-kit"
  import { onDestroy, onMount } from "svelte"

  let {
    content,
    onChange,
  }: {
    content: unknown | null
    onChange: (content: unknown) => void
  } = $props()

  let element: HTMLDivElement
  let editor: Editor | null = null

  onMount(() => {
    editor = new Editor({
      element,
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: "Add a description..." }),
        Link.configure({ openOnClick: false }),
      ],
      content: (content as any) ?? "",
      onUpdate: ({ editor }) => {
        onChange(editor.getJSON())
      },
      editorProps: {
        attributes: {
          class: "prose prose-invert prose-sm max-w-none focus:outline-none min-h-[80px] text-gray-100",
        },
      },
    })
  })

  onDestroy(() => {
    editor?.destroy()
  })
</script>

<div class="border border-border rounded bg-surface p-2 text-sm">
  <div bind:this={element}></div>
</div>

<style>
  :global(.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: #6b7280;
    pointer-events: none;
    height: 0;
  }
  :global(.ProseMirror) {
    padding: 4px;
  }
  :global(.ProseMirror h2) {
    font-size: 1.1em;
    font-weight: 600;
    margin-bottom: 0.25em;
  }
  :global(.ProseMirror h3) {
    font-size: 1em;
    font-weight: 600;
    margin-bottom: 0.25em;
  }
  :global(.ProseMirror ul) {
    list-style: disc;
    padding-left: 1.2em;
  }
  :global(.ProseMirror ol) {
    list-style: decimal;
    padding-left: 1.2em;
  }
  :global(.ProseMirror code) {
    background: #2a2a2a;
    padding: 0.1em 0.3em;
    border-radius: 3px;
    font-size: 0.85em;
  }
  :global(.ProseMirror pre) {
    background: #2a2a2a;
    padding: 0.75em 1em;
    border-radius: 6px;
    overflow-x: auto;
  }
  :global(.ProseMirror blockquote) {
    border-left: 3px solid #3a3a3a;
    padding-left: 1em;
    color: #888;
  }
</style>
