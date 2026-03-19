import { getListsCollection, getTagsCollection, getTasksCollection, getUserSettingsCollection } from "$lib/server/collections"
import { DEFAULT_STATUSES, TAG_COLORS } from "$lib/types"
import { serializeDoc } from "$lib/utils"
import { redirect } from "@sveltejs/kit"
import { ObjectId } from "mongodb"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, "/auth/login")

  const listsCol = await getListsCollection()
  const lists = await listsCol.find({ userId: locals.user.id, archivedAt: null }).sort({ order: 1 }).toArray()

  const settingsCol = await getUserSettingsCollection()
  let settings = await settingsCol.findOne({ userId: locals.user.id })
  if (!settings) {
    const doc = { userId: locals.user.id, statusConfig: DEFAULT_STATUSES }
    await settingsCol.insertOne(doc as any)
    settings = doc as any
  }

  const tagsCol = await getTagsCollection()

  // One-time migration: convert string tags on tasks to Tag documents
  if (!settings!.tagsMigrated) {
    const tasksCol = await getTasksCollection()
    const distinctTagNames: string[] = await tasksCol.distinct("tags", { userId: locals.user.id })

    // Only migrate entries that look like plain strings (not 24-char hex ObjectIds)
    const stringNames = distinctTagNames.filter(t => !/^[0-9a-f]{24}$/.test(t))

    if (stringNames.length > 0) {
      const nameToId = new Map<string, string>()
      const colorList = TAG_COLORS

      for (let i = 0; i < stringNames.length; i++) {
        const name = stringNames[i]
        const existing = await tagsCol.findOne({ userId: locals.user.id, name })
        if (existing) {
          nameToId.set(name, existing._id.toString())
        } else {
          const tagDoc = {
            _id: new ObjectId(),
            userId: locals.user.id,
            name,
            color: colorList[i % colorList.length],
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          await tagsCol.insertOne(tagDoc as any)
          nameToId.set(name, tagDoc._id.toString())
        }
      }

      // Update tasks: replace string names with tag IDs
      const tasks = await tasksCol.find({ userId: locals.user.id, tags: { $exists: true, $not: { $size: 0 } } }).toArray()
      for (const task of tasks) {
        const migratedTags = (task.tags as string[]).map(t => nameToId.get(t) ?? t)
        await tasksCol.updateOne({ _id: task._id }, { $set: { tags: migratedTags } })
      }
    }

    await settingsCol.updateOne({ userId: locals.user.id }, { $set: { tagsMigrated: true } })
  }

  const tags = await tagsCol.find({ userId: locals.user.id }).sort({ name: 1 }).toArray()

  return {
    user: {
      id: locals.user.id,
      email: locals.user.email,
      displayName: locals.user.displayName,
    },
    lists: lists.map(serializeDoc),
    statusConfig: settings!.statusConfig,
    tags: tags.map(serializeDoc),
  }
}
