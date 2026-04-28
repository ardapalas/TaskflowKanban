import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signout } from '../login/actions'
import { createBoard, deleteBoard } from './actions'
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
              <div key={board.id} className="relative group">
                <Link href={`/board/${board.id}`} className="block h-full">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <CardTitle className="text-base pr-8 break-words">{board.title}</CardTitle>
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
                <form action={deleteBoard} className="absolute top-3 right-3">
                  <input type="hidden" name="boardId" value={board.id} />
                  <button
                    type="submit"
                    aria-label="Delete board"
                    className="rounded p-1.5 text-slate-400 opacity-60 hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </form>
              </div>
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