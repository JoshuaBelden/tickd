<script lang="ts">
  import type { List, NodePosition, Task } from "$lib/types"
  import { Background, BackgroundVariant, Controls, MiniMap, SvelteFlow } from "@xyflow/svelte"
  import "@xyflow/svelte/dist/style.css"
  import { writable } from "svelte/store"

  let { tasks, list, onTaskClick, onUpdatePosition } = $props<{
    tasks: Task[]
    list: List
    onTaskClick: (id: string) => void
    onUpdatePosition: (id: string, pos: NodePosition) => Promise<void>
  }>()

  function buildGraph(tasks: Task[]) {
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

      const status = list.statusConfig.find((s: { id: string }) => s.id === task.status)

      nodes.push({
        id: task._id,
        type: "default",
        position: { x, y },
        data: { label: task.title, taskId: task._id },
        style: `background:#1e1e1e;border:1px solid ${status?.color ?? "#2a2a2a"};color:#f1f1f1;border-radius:6px;padding:6px 12px;font-size:13px;cursor:pointer;max-width:160px;`,
      })

      edges.push({
        id: `root-${task._id}`,
        source: "root",
        target: task._id,
        style: "stroke:#3a3a3a",
      })

      const subtasks = tasks.filter(t => t.parentId === task._id)
      subtasks.forEach((sub, j) => {
        const subAngle = angleStep * i - Math.PI / 2 + (j - (subtasks.length - 1) / 2) * 0.4
        const subX = sub.nodePosition?.x ?? x + 160 * Math.cos(subAngle)
        const subY = sub.nodePosition?.y ?? y + 160 * Math.sin(subAngle)
        const subStatus = list.statusConfig.find((s: { id: string }) => s.id === sub.status)

        nodes.push({
          id: sub._id,
          type: "default",
          position: { x: subX, y: subY },
          data: { label: sub.title, taskId: sub._id },
          style: `background:#161616;border:1px solid ${subStatus?.color ?? "#2a2a2a"};color:#d1d1d1;border-radius:4px;padding:4px 10px;font-size:12px;cursor:pointer;max-width:140px;`,
        })

        edges.push({
          id: `${task._id}-${sub._id}`,
          source: task._id,
          target: sub._id,
          style: "stroke:#2a2a2a",
        })
      })
    })

    return { nodes, edges }
  }

  const nodesStore = writable<any[]>([])
  const edgesStore = writable<any[]>([])

  $effect(() => {
    const { nodes, edges } = buildGraph(tasks)
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
    if (node.id !== "root" && node.data.taskId) {
      onTaskClick(node.data.taskId)
    }
  }
</script>

<div class="w-full h-full">
  <SvelteFlow nodes={nodesStore} edges={edgesStore} fitView on:nodedragstop={onNodeDragStop} on:nodeclick={onNodeClick}>
    <Controls />
    <MiniMap style="background:#1e1e1e;" />
    <Background variant={BackgroundVariant.Dots} patternColor="#2a2a2a" />
  </SvelteFlow>
</div>
