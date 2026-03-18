import { writable } from "svelte/store"

export const selectedTaskId = writable<string | null>(null)
export const viewMode = writable<"list" | "map">("list")
export const sidebarOpen = writable(true)
