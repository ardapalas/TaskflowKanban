import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signout } from '../login/actions'
import { createBoard } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Link from 'next/link'

type Props = {
  searchParams: Promise<{ error?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { error } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Kullanıcının boardlarını getir
  const { data: boards } = await supabase
    .from('boards')
    .select('id, title, created_at')
    .order('created_at', { ascending: false })

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
            Create and manage your Kanban boards
          </p>
        </div>

        {/* Create Board Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Create new board</CardTitle>
          </CardHeader>
          <form action={createBoard}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Board title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="My new project"
                  required
                  maxLength={100}
                />
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit">Create board</Button>
            </CardFooter>
          </form>
        </Card>

        {/* Board List */}
        {boards && boards.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <Link key={board.id} href={`/board/${board.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="text-base">{board.title}</CardTitle>
                    <CardDescription className="text-xs">
                      Created{' '}
                      {new Date(board.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-600">
                No boards yet. Create your first board above to get started.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}