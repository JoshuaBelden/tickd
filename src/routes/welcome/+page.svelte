<script lang="ts">
  import { goto } from "$app/navigation"

  async function createFirstList() {
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "General", color: "#6366f1", icon: "📋" }),
    })
    const list = await res.json()
    goto(`/${list._id}`)
  }
</script>

<div class="min-h-screen flex items-center justify-center">
  <div class="text-center">
    <h1 class="text-4xl font-bold mb-4">Welcome to Tickd</h1>
    <p class="text-gray-400 mb-8">Your personal task manager. Let's create your first list.</p>
    <button class="btn-primary" onclick={createFirstList}>Create First List</button>
  </div>
</div>
