import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BoardClient } from './BoardClient'

type BoardPageProps = {
  params: Promise<{
    id: string
  }>
}

type Card = {
  id: string
  title: string
  description: string | null
  position: number
}

type Column = {
  id: string
  title: string
  position: number
  cards: Card[]
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { id } = await params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select('id, title, created_at')
    .eq('id', id)
    .single()

  if (boardError || !board) {
    notFound()
  }

  const { data: columns, error: columnsError } = await supabase
    .from('columns')
    .select(`
      id,
      title,
      position,
      cards (
        id,
        title,
        description,
        position
      )
    `)
    .eq('board_id', board.id)
    .order('position', { ascending: true })
    .order('position', {
      referencedTable: 'cards',
      ascending: true,
    })

  if (columnsError) {
    throw new Error(columnsError.message)
  }

  const typedColumns = (columns ?? []) as Column[]

  return (
    <BoardClient
      boardId={board.id}
      boardTitle={board.title}
      initialColumns={typedColumns}
    />
  )
}