import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">TaskFlow</h1>
        <p className="text-slate-600">Kanban project management board</p>
        <Button>Get Started</Button>
      </div>
    </main>
  )
}