export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Task {
  id: number
  title: string
  description: string
  project_id: number
  project_name?: string
  project_key?: string
  parent_id: number | null
  status: TaskStatus
  priority: TaskPriority
  start_date: string | null
  end_date: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface TaskCreateData {
  title: string
  description?: string
  project_id?: number
  parent_id?: number | null
  status?: TaskStatus
  priority?: TaskPriority
  start_date?: string | null
  end_date?: string | null
}

export interface TaskUpdateData {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  start_date?: string | null
  end_date?: string | null
}
