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
  let editor: Editor | null = $state(null)
  let focused = $state(false)

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
      onFocus: () => {
        focused = true
      },
      onBlur: () => {
        focused = false
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

  function cmd(fn: () => void) {
    return (e: MouseEvent) => {
      e.preventDefault()
      fn()
      editor?.view.focus()
    }
  }
</script>

<div class="border border-border rounded bg-surface text-sm">
  {#if focused}
    <div class="flex items-center gap-0.5 px-2 py-1 border-b border-border flex-wrap">
      <button
        class="toolbar-btn font-bold"
        onmousedown={cmd(() => editor?.chain().toggleBold().run())}
        class:active={editor?.isActive("bold")}
        title="Bold"
      >B</button>
      <button
        class="toolbar-btn italic"
        onmousedown={cmd(() => editor?.chain().toggleItalic().run())}
        class:active={editor?.isActive("italic")}
        title="Italic"
      >I</button>
      <button
        class="toolbar-btn line-through"
        onmousedown={cmd(() => editor?.chain().toggleStrike().run())}
        class:active={editor?.isActive("strike")}
        title="Strikethrough"
      >S</button>
      <span class="w-px h-4 bg-border mx-1"></span>
      <button
        class="toolbar-btn text-xs"
        onmousedown={cmd(() => editor?.chain().toggleHeading({ level: 2 }).run())}
        class:active={editor?.isActive("heading", { level: 2 })}
        title="Heading"
      >H1</button>
      <button
        class="toolbar-btn text-xs"
        onmousedown={cmd(() => editor?.chain().toggleHeading({ level: 3 }).run())}
        class:active={editor?.isActive("heading", { level: 3 })}
        title="Subheading"
      >H2</button>
      <span class="w-px h-4 bg-border mx-1"></span>
      <button
        class="toolbar-btn"
        onmousedown={cmd(() => editor?.chain().toggleBulletList().run())}
        class:active={editor?.isActive("bulletList")}
        title="Bullet list"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5">
          <circle cx="2" cy="4" r="1.5"/><rect x="5" y="3" width="10" height="2" rx="1"/>
          <circle cx="2" cy="8" r="1.5"/><rect x="5" y="7" width="10" height="2" rx="1"/>
          <circle cx="2" cy="12" r="1.5"/><rect x="5" y="11" width="10" height="2" rx="1"/>
        </svg>
      </button>
      <button
        class="toolbar-btn"
        onmousedown={cmd(() => editor?.chain().toggleOrderedList().run())}
        class:active={editor?.isActive("orderedList")}
        title="Numbered list"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5">
          <text x="0" y="5" font-size="5" font-family="monospace">1.</text>
          <rect x="5" y="3" width="10" height="2" rx="1"/>
          <text x="0" y="9" font-size="5" font-family="monospace">2.</text>
          <rect x="5" y="7" width="10" height="2" rx="1"/>
          <text x="0" y="13" font-size="5" font-family="monospace">3.</text>
          <rect x="5" y="11" width="10" height="2" rx="1"/>
        </svg>
      </button>
      <span class="w-px h-4 bg-border mx-1"></span>
      <button
        class="toolbar-btn font-mono text-xs"
        onmousedown={cmd(() => editor?.chain().toggleCode().run())}
        class:active={editor?.isActive("code")}
        title="Inline code"
      >&lt;/&gt;</button>
      <button
        class="toolbar-btn font-mono text-xs"
        onmousedown={cmd(() => editor?.chain().toggleCodeBlock().run())}
        class:active={editor?.isActive("codeBlock")}
        title="Code block"
      >```</button>
      <button
        class="toolbar-btn"
        onmousedown={cmd(() => editor?.chain().toggleBlockquote().run())}
        class:active={editor?.isActive("blockquote")}
        title="Blockquote"
      >"</button>
    </div>
  {/if}
  <div class="p-2" bind:this={element}></div>
</div>

<style>
  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5rem;
    height: 1.5rem;
    padding: 0 0.25rem;
    border-radius: 3px;
    font-size: 0.75rem;
    color: #9ca3af;
    transition: color 0.1s, background-color 0.1s;
  }
  .toolbar-btn:hover {
    color: #f3f4f6;
    background-color: rgba(255,255,255,0.08);
  }
  .toolbar-btn.active {
    color: #f3f4f6;
    background-color: rgba(255,255,255,0.12);
  }

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
