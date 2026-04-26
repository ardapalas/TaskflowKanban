import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">TaskFlow</h1>
        <p className="mt-4 text-slate-600">
          Kanban project management board
        </p>

        <Button asChild className="mt-6">
          <Link href="/login">Get Started</Link>
        </Button>
      </div>
    </main>
  )
}