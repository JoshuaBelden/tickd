<script lang="ts">
  import { enhance } from "$app/forms"

  let { form } = $props()
</script>

<div class="min-h-screen flex items-center justify-center">
  <div class="w-80 space-y-6">
    <div class="text-center">
      <h1 class="text-3xl font-bold tracking-tight">tickd</h1>
      <p class="text-gray-400 mt-1 text-sm">Sign in to your account</p>
    </div>

    <form method="POST" use:enhance class="card space-y-4">
      {#if form?.error}
        <p class="text-red-400 text-sm">{form.error}</p>
      {/if}
      <div>
        <label class="text-xs text-gray-400 block mb-1">Email</label>
        <input class="input" type="email" name="email" required autocomplete="email" />
      </div>
      <div>
        <label class="text-xs text-gray-400 block mb-1">Password</label>
        <input class="input" type="password" name="password" required autocomplete="current-password" />
      </div>
      <button class="btn-primary w-full">Sign In</button>
    </form>

    <p class="text-center text-sm text-gray-500">
      No account? <a href="/auth/register" class="text-accent hover:underline">Sign up</a>
    </p>
  </div>
</div>
