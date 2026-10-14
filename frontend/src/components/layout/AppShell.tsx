import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--sp-bg)]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto pt-2"
          style={{ paddingInline: 'var(--sp-page-pad-x)', paddingBottom: 'var(--sp-page-pad-b)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
