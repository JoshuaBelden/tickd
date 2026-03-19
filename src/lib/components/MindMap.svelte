<script lang="ts">
  import type { List, NodePosition, StatusConfig, Task } from "$lib/types"
  import { Background, BackgroundVariant, Controls, MiniMap, SvelteFlow } from "@xyflow/svelte"
  import "@xyflow/svelte/dist/style.css"
  import { writable } from "svelte/store"

  let { tasks, list, statusConfig, onTaskClick, onUpdatePosition } = $props<{
    tasks: Task[]
    list: List
    statusConfig: StatusConfig[]
    onTaskClick: (id: string) => void
    onUpdatePosition: (id: string, pos: NodePosition) => Promise<void>
  }>()

  let collapsedParents = $state<Set<string>>(new Set())

  function toggleCollapse(taskId: string) {
    const next = new Set(collapsedParents)
    if (next.has(taskId)) next.delete(taskId)
    else next.add(taskId)
    collapsedParents = next
  }

  function buildGraph(tasks: Task[], collapsed: Set<string>) {
    const nodes: any[] = []
    const edges: any[] = []

    // Root node
    nodes.push({
      id: "root",
      type: "default",
      position: { x: 400, y: 300 },
      data: { label: list.name },
      style: "background:#6366f1;border:none;color:white;font-weight:600;border-radius:8px;padding:8px 16px;",
    })

    const rootTasks = tasks.filter(t => !t.parentId)
    const angleStep = (2 * Math.PI) / Math.max(rootTasks.length, 1)
    const radius = 200

    rootTasks.forEach((task, i) => {
      const hasPosition = task.nodePosition?.x !== undefined
      const x = hasPosition ? task.nodePosition!.x : 400 + radius * Math.cos(angleStep * i - Math.PI / 2)
      const y = hasPosition ? task.nodePosition!.y : 300 + radius * Math.sin(angleStep * i - Math.PI / 2)

      const status = statusConfig.find((s: { id: string }) => s.id === task.status)
      const subtasks = tasks.filter(t => t.parentId === task._id)
      const isCollapsed = collapsed.has(task._id) && subtasks.length > 0
      const label = subtasks.length > 0
        ? `${task.title} [${isCollapsed ? "+" : "−"}${subtasks.length}]`
        : task.title

      nodes.push({
        id: task._id,
        type: "default",
        position: { x, y },
        data: { label, taskId: task._id, hasSubtasks: subtasks.length > 0 },
        style: `background:#1e1e1e;border:1px solid ${status?.color ?? "#2a2a2a"};color:#f1f1f1;border-radius:6px;padding:6px 12px;font-size:13px;cursor:pointer;max-width:160px;`,
      })

      edges.push({
        id: `root-${task._id}`,
        source: "root",
        target: task._id,
        style: "stroke:#3a3a3a",
      })

      if (!isCollapsed) {
        subtasks.forEach((sub, j) => {
          const subAngle = angleStep * i - Math.PI / 2 + (j - (subtasks.length - 1) / 2) * 0.4
          const subX = sub.nodePosition?.x ?? x + 160 * Math.cos(subAngle)
          const subY = sub.nodePosition?.y ?? y + 160 * Math.sin(subAngle)
          const subStatus = statusConfig.find((s: { id: string }) => s.id === sub.status)

          nodes.push({
            id: sub._id,
            type: "default",
            position: { x: subX, y: subY },
            data: { label: sub.title, taskId: sub._id, hasSubtasks: false },
            style: `background:#161616;border:1px solid ${subStatus?.color ?? "#2a2a2a"};color:#d1d1d1;border-radius:4px;padding:4px 10px;font-size:12px;cursor:pointer;max-width:140px;`,
          })

          edges.push({
            id: `${task._id}-${sub._id}`,
            source: task._id,
            target: sub._id,
            style: "stroke:#2a2a2a",
          })
        })
      }
    })

    return { nodes, edges }
  }

  const nodesStore = writable<any[]>([])
  const edgesStore = writable<any[]>([])

  $effect(() => {
    const { nodes, edges } = buildGraph(tasks, collapsedParents)
    nodesStore.set(nodes)
    edgesStore.set(edges)
  })

  function onNodeDragStop(event: any) {
    const { node } = event.detail
    if (node.id !== "root") {
      onUpdatePosition(node.id, { x: node.position.x, y: node.position.y })
    }
  }

  function onNodeClick(event: any) {
    const { node } = event.detail
    if (node.id === "root" || !node.data.taskId) return
    if (node.data.hasSubtasks) {
      toggleCollapse(node.data.taskId)
    } else {
      onTaskClick(node.data.taskId)
    }
  }

  function onNodeDoubleClick(event: any) {
    const { node } = event.detail
    if (node.id !== "root" && node.data.taskId) {
      onTaskClick(node.data.taskId)
    }
  }
</script>

<div class="w-full h-full">
  <SvelteFlow nodes={nodesStore} edges={edgesStore} fitView on:nodedragstop={onNodeDragStop} on:nodeclick={onNodeClick} on:nodedoubleclick={onNodeDoubleClick}>
    <Controls />
    <MiniMap style="background:#1e1e1e;" />
    <Background variant={BackgroundVariant.Dots} patternColor="#2a2a2a" />
  </SvelteFlow>
</div>
