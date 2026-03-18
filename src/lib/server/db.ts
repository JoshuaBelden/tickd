import { MONGODB_URI } from "$env/static/private"
import { MongoClient } from "mongodb"

const g = globalThis as typeof globalThis & { _mongo?: Promise<MongoClient> }
if (!g._mongo) {
  g._mongo = new MongoClient(MONGODB_URI).connect()
}

export const clientPromise: Promise<MongoClient> = g._mongo

export async function getDb() {
  const client = await clientPromise
  return client.db("tickd")
}
