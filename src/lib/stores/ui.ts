import { writable } from "svelte/store"

export const selectedTaskId = writable<string | null>(null)
export const viewMode = writable<"list" | "board" | "map">("list")

function persistedWritable<T>(key: string, initial: T) {
  const stored = typeof window !== "undefined" ? localStorage.getItem(key) : null
  const store = writable<T>(stored !== null ? JSON.parse(stored) : initial)
  store.subscribe(value => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(value))
    }
  })
  return store
}

export const sidebarOpen = persistedWritable("sidebarOpen", true)
export const showSubtasksInList = persistedWritable("showSubtasksInList", false)

export const showSearch = writable(false)
