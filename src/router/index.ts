import { createRouter, createWebHashHistory } from 'vue-router'
import ProjectView from '@/views/ProjectView.vue'
import Settings from '@/views/Settings.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'Project',
      component: ProjectView
    },
    {
      path: '/settings',
      name: 'Settings',
      component: Settings
    }
  ]
})

export default router
