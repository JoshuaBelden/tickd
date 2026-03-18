import type { List, Task } from "$lib/types"
import type { Collection, Document } from "mongodb"
import { getDb } from "./db"

export async function getUsersCollection() {
  const db = await getDb()
  return db.collection("users")
}

export async function getSessionsCollection() {
  const db = await getDb()
  return db.collection("sessions")
}

export async function getListsCollection(): Promise<Collection<List & Document>> {
  const db = await getDb()
  return db.collection("lists") as Collection<List & Document>
}

export async function getTasksCollection(): Promise<Collection<Task & Document>> {
  const db = await getDb()
  return db.collection("tasks") as Collection<Task & Document>
}
