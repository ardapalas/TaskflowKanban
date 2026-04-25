import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signout } from '../login/actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">TaskFlow</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{user.email}</span>
            <form action={signout}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Your boards</h2>
          <p className="text-slate-600 mt-1">
            Manage your projects with Kanban-style boards
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome, {user.email?.split('@')[0]}!</CardTitle>
            <CardDescription>
              Your boards will appear here. Board creation coming next.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              User ID: <code className="text-xs">{user.id}</code>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}