export type ProjectStatus = 'active' | 'completed'

export interface Project {
  id: number
  name: string
  key: string
  color: string
  description: string
  status: ProjectStatus
  sync_version?: number
  created_at: string
  updated_at: string
}

export interface ProjectCreateData {
  name: string
  key: string
  color?: string
  description?: string
}

export interface ProjectUpdateData {
  name?: string
  color?: string
  description?: string
  status?: ProjectStatus
}
