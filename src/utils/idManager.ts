const STORAGE_KEY = 'local_max_ids'

function load(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch { return {} }
}

function save(data: Record<string, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getNextLocalId(entity: string): number {
  const data = load()
  data[entity] = (data[entity] || 0) + 1
  save(data)
  return data[entity]
}

export function registerRemoteId(entity: string, id: number) {
  if (!id || id >= 1000000000000) return
  const data = load()
  if (id > (data[entity] || 0)) {
    data[entity] = id
    save(data)
  }
}

export function updateMaxFromItems(entity: string, items: Array<{ id: number }>) {
  if (items.length === 0) return
  let max = 0
  for (const item of items) {
    if (item.id < 1000000000000 && item.id > max) max = item.id
  }
  if (max > 0) {
    const data = load()
    if (max > (data[entity] || 0)) {
      data[entity] = max
      save(data)
    }
  }
}

export function updateMaxFromRemap(remap: Record<string, number>) {
  const data = load()
  let changed = false
  for (const [oldId, newId] of Object.entries(remap)) {
    // entity 从 oldId 推断不出来。简单处理: 遍历所有 entity，如果 newId > max 就更新
    const nid = Number(newId)
    if (nid >= 1000000000000) continue
    for (const key of Object.keys(data)) {
      if (nid > (data[key] || 0)) {
        data[key] = nid
        changed = true
      }
    }
  }
  if (changed) save(data)
}
