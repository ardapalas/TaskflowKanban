'use client'

import { FormEvent, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  createCard,
  createCardFallback,
  deleteCard,
  deleteCardFallback,
  updateCard,
  moveCard,
  createColumn,
  updateColumn,
  deleteColumn,
  getCardActivities,
  type Activity,
} from './actions'

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

type BoardClientProps = {
  boardId: string
  boardTitle: string
  initialColumns: Column[]
}

function createTemporaryId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `temp-${crypto.randomUUID()}`
  }
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function formatActivityDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SortableCard({
  card,
  boardId,
  moveOptions,
  onDeleteCard,
  onUpdateCard,
  onMoveToColumn,
}: {
  card: Card
  boardId: string
  moveOptions: { id: string; title: string }[]
  onDeleteCard: (cardId: string, event: FormEvent<HTMLFormElement>) => void
  onUpdateCard: (cardId: string, event: FormEvent<HTMLFormElement>) => void
  onMoveToColumn: (cardId: string, targetColumnId: string) => void
}) {
  const [showHistory, setShowHistory] = useState(false)
  const [activities, setActivities] = useState<Activity[] | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  async function handleToggleHistory() {
    if (showHistory) {
      setShowHistory(false)
      return
    }
    setShowHistory(true)
    if (activities === null) {
      setLoadingHistory(true)
      try {
        const data = await getCardActivities(card.id)
        setActivities(data)
      } finally {
        setLoadingHistory(false)
      }
    }
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border bg-slate-50 p-3 transition-all duration-150 ${
        isDragging ? 'opacity-50 shadow-2xl rotate-2' : ''
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium break-words">{card.title}</h3>

          {card.description ? (
            <p className="mt-1 text-sm text-slate-600 break-words">{card.description}</p>
          ) : null}
        </div>

        <button
          type="button"
          {...attributes}
          {...listeners}
          style={{ touchAction: 'none' }}
          className="touch-none select-none cursor-grab rounded-md border bg-white px-4 py-2 text-sm font-medium text-slate-600 active:cursor-grabbing"
          aria-label="Drag card"
        >
          Drag
        </button>
      </div>

      <form
        key={`update-${card.id}-${card.title}-${card.description ?? ''}`}
        onSubmit={(event) => onUpdateCard(card.id, event)}
        className="space-y-2 border-t pt-3"
      >
        <input type="hidden" name="cardId" value={card.id} />
        <input type="hidden" name="boardId" value={boardId} />

        <input
          name="title"
          defaultValue={card.title}
          required
          maxLength={100}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        />

        <textarea
          name="description"
          defaultValue={card.description ?? ''}
          maxLength={500}
          onPointerDown={(e) => e.stopPropagation()}
          className="min-h-16 w-full resize-none rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            onPointerDown={(e) => e.stopPropagation()}
            style={{ touchAction: 'manipulation' }}
            className="text-xs font-medium text-slate-700 hover:text-slate-950"
          >
            Save
          </button>

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            style={{ touchAction: 'manipulation' }}
            onClick={handleToggleHistory}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            {showHistory ? 'Hide history' : 'History'}
          </button>
        </div>
      </form>

      {showHistory && (
        <div className="mt-2 rounded-lg bg-slate-100 p-2 space-y-1">
          {loadingHistory ? (
            <p className="text-xs text-slate-500">Loading…</p>
          ) : activities && activities.length > 0 ? (
            activities.map((activity) => (
              <p key={activity.id} className="text-xs text-slate-600">
                <span className="font-medium">{activity.from_column_title ?? '—'}</span>
                {' → '}
                <span className="font-medium">{activity.to_column_title ?? '—'}</span>
                <span className="ml-1 text-slate-400">· {formatActivityDate(activity.moved_at)}</span>
              </p>
            ))
          ) : (
            <p className="text-xs text-slate-500">No move history yet.</p>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center gap-3">
        <form
          action={deleteCardFallback}
          onSubmit={(event) => onDeleteCard(card.id, event)}
        >
          <input type="hidden" name="cardId" value={card.id} />
          <input type="hidden" name="boardId" value={boardId} />

          <button
            type="submit"
            onPointerDown={(event) => event.stopPropagation()}
            style={{ touchAction: 'manipulation' }}
            className="text-xs font-medium text-red-600 hover:text-red-700"
          >
            Delete
          </button>
        </form>

        {moveOptions.length > 0 && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            style={{ touchAction: 'manipulation' }}
            onClick={() => setShowMoveMenu((v) => !v)}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Move →
          </button>
        )}
      </div>

      {showMoveMenu && moveOptions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {moveOptions.map((col) => (
            <button
              key={col.id}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              style={{ touchAction: 'manipulation' }}
              onClick={() => {
                onMoveToColumn(card.id, col.id)
                setShowMoveMenu(false)
              }}
              className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300 active:bg-slate-400"
            >
              {col.title}
            </button>
          ))}
        </div>
      )}
    </article>
  )
}

function DroppableColumn({
  column,
  boardId,
  allColumns,
  activeDragSourceColumnId,
  activeDragOverColumnId,
  onCreateCard,
  onDeleteCard,
  onUpdateCard,
  onUpdateColumn,
  onDeleteColumn,
  onMoveCardToColumn,
}: {
  column: Column
  boardId: string
  allColumns: { id: string; title: string }[]
  activeDragSourceColumnId: string | null
  activeDragOverColumnId: string | null
  onCreateCard: (columnId: string, event: FormEvent<HTMLFormElement>) => void
  onDeleteCard: (cardId: string, event: FormEvent<HTMLFormElement>) => void
  onUpdateCard: (cardId: string, event: FormEvent<HTMLFormElement>) => void
  onUpdateColumn: (columnId: string, title: string) => void
  onDeleteColumn: (columnId: string) => void
  onMoveCardToColumn: (cardId: string, targetColumnId: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(column.title)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  })

  const isSource = column.id === activeDragSourceColumnId
  const isTarget =
    (isOver || activeDragOverColumnId === column.id) && !isSource

  function commitTitleEdit() {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== column.title) {
      onUpdateColumn(column.id, trimmed)
    } else {
      setEditTitle(column.title)
    }
    setIsEditing(false)
  }

  return (
    <section
      ref={setNodeRef}
      className={`rounded-2xl border bg-white p-4 shadow-sm transition-all duration-150 ${
        isSource
          ? 'ring-2 ring-red-400'
          : isTarget
            ? 'ring-2 ring-green-400'
            : ''
      }`}
    >
      <div className="mb-4 flex items-center gap-2">
        {isEditing ? (
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={commitTitleEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitTitleEdit()
              }
              if (e.key === 'Escape') {
                setEditTitle(column.title)
                setIsEditing(false)
              }
            }}
            autoFocus
            maxLength={100}
            className="flex-1 min-w-0 font-semibold text-sm rounded px-1 -ml-1 outline-none focus:ring-2 focus:ring-slate-300 bg-slate-50"
          />
        ) : (
          <h2
            className="flex-1 min-w-0 font-semibold truncate cursor-pointer hover:text-slate-700 rounded px-1 -ml-1"
            onClick={() => {
              setEditTitle(column.title)
              setIsEditing(true)
            }}
            title="Click to rename"
          >
            {column.title}
          </h2>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
            {column.cards.length}
          </span>

          {showDeleteConfirm ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  onDeleteColumn(column.id)
                  setShowDeleteConfirm(false)
                }}
                className="min-h-[44px] rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="min-h-[44px] rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
              aria-label="Delete column"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <SortableContext
        id={column.id}
        items={column.cards.map((card) => card.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-24 space-y-3 rounded-xl">
          {column.cards.length > 0 ? (
            column.cards.map((card) => (
              <SortableCard
                key={card.id}
                card={card}
                boardId={boardId}
                moveOptions={allColumns.filter((c) => c.id !== column.id)}
                onDeleteCard={onDeleteCard}
                onUpdateCard={onUpdateCard}
                onMoveToColumn={onMoveCardToColumn}
              />
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">
              Drop cards here.
            </div>
          )}
        </div>
      </SortableContext>

      <form
        action={createCardFallback}
        onSubmit={(event) => onCreateCard(column.id, event)}
        className="mt-4 space-y-2"
      >
        <input type="hidden" name="columnId" value={column.id} />
        <input type="hidden" name="boardId" value={boardId} />

        <input
          name="title"
          placeholder="Card title"
          required
          maxLength={100}
          className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        />

        <textarea
          name="description"
          placeholder="Description optional"
          maxLength={500}
          className="min-h-20 w-full resize-none rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        />

        <button
          type="submit"
          className="w-full rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add card
        </button>
      </form>
    </section>
  )
}


export function BoardClient({
  boardId,
  boardTitle,
  initialColumns,
}: BoardClientProps) {
  const [columns, setColumns] = useState(initialColumns)
  const [activeDragSourceColumnId, setActiveDragSourceColumnId] = useState<string | null>(null)
  const [activeDragOverColumnId, setActiveDragOverColumnId] = useState<string | null>(null)
  const [activeDragCard, setActiveDragCard] = useState<Card | null>(null)
  const [showAddColumn, setShowAddColumn] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  function handleDragStart(event: DragStartEvent) {
    const activeCardId = event.active.id.toString()
    for (const column of columns) {
      const found = column.cards.find((card) => card.id === activeCardId)
      if (found) {
        setActiveDragSourceColumnId(column.id)
        setActiveDragOverColumnId(null)
        setActiveDragCard(found)
        return
      }
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const over = event.over

    if (!over) {
      setActiveDragOverColumnId(null)
      return
    }

    if (over.data.current?.type === 'column') {
      setActiveDragOverColumnId(over.data.current?.columnId ?? null)
      return
    }

    const overId = over.id.toString()
    const targetColumn = columns.find((column) =>
      column.cards.some((card) => card.id === overId)
    )

    setActiveDragOverColumnId(targetColumn?.id ?? null)
  }

  function handleDragCancel() {
    setActiveDragSourceColumnId(null)
    setActiveDragOverColumnId(null)
    setActiveDragCard(null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragSourceColumnId(null)
    setActiveDragOverColumnId(null)
    setActiveDragCard(null)

    const { active, over } = event

    if (!over) {
      return
    }

    const activeCardId = active.id.toString()
    const overId = over.id.toString()

    let sourceColumnId: string | null = null
    let targetColumnId: string | null = null

    for (const column of columns) {
      if (column.cards.some((card) => card.id === activeCardId)) {
        sourceColumnId = column.id
      }
    }

    const overType = over.data.current?.type

    if (overType === 'column') {
      targetColumnId = over.data.current?.columnId
    } else {
      for (const column of columns) {
        if (column.cards.some((card) => card.id === overId)) {
          targetColumnId = column.id
        }
      }
    }

    if (!sourceColumnId || !targetColumnId) {
      return
    }

    const sourceColumn = columns.find((column) => column.id === sourceColumnId)
    const targetColumn = columns.find((column) => column.id === targetColumnId)

    if (!sourceColumn || !targetColumn) {
      return
    }

    const activeCard = sourceColumn.cards.find(
      (card) => card.id === activeCardId
    )

    if (!activeCard) {
      return
    }

    const sourceCards = sourceColumn.cards.filter(
      (card) => card.id !== activeCardId
    )

    const targetCards =
      sourceColumnId === targetColumnId
        ? sourceCards
        : [...targetColumn.cards]

    const overIndex = targetCards.findIndex((card) => card.id === overId)
    const insertIndex = overIndex >= 0 ? overIndex : targetCards.length

    const nextTargetCards = [
      ...targetCards.slice(0, insertIndex),
      activeCard,
      ...targetCards.slice(insertIndex),
    ]

    const nextColumns = columns.map((column) => {
      if (column.id === sourceColumnId && column.id === targetColumnId) {
        return {
          ...column,
          cards: nextTargetCards.map((card, index) => ({
            ...card,
            position: index,
          })),
        }
      }

      if (column.id === sourceColumnId) {
        return {
          ...column,
          cards: sourceCards.map((card, index) => ({
            ...card,
            position: index,
          })),
        }
      }

      if (column.id === targetColumnId) {
        return {
          ...column,
          cards: nextTargetCards.map((card, index) => ({
            ...card,
            position: index,
          })),
        }
      }

      return column
    })

    setColumns(nextColumns)

    await moveCard({
      boardId,
      cardId: activeCardId,
      targetColumnId,
      orderedCardIds: nextTargetCards.map((card) => card.id),
      sourceColumnId,
      sourceOrderedCardIds: sourceCards.map((card) => card.id),
    })
  }

  async function handleCreateCard(
    columnId: string,
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const title = formData.get('title')?.toString().trim()
    const description = formData.get('description')?.toString().trim() ?? ''

    if (!title) {
      return
    }

    const targetColumn = columns.find((column) => column.id === columnId)
    const position = targetColumn?.cards.length ?? 0
    const tempId = createTemporaryId()

    const optimisticCard: Card = {
      id: tempId,
      title,
      description: description || null,
      position,
    }

    setColumns((currentColumns) =>
      currentColumns.map((column) =>
        column.id === columnId
          ? { ...column, cards: [...column.cards, optimisticCard] }
          : column
      )
    )

    form.reset()

    try {
      const createdCard = await createCard(formData)

      if (!createdCard) {
        throw new Error('Card could not be created')
      }

      setColumns((currentColumns) =>
        currentColumns.map((column) =>
          column.id === columnId
            ? {
                ...column,
                cards: column.cards.map((card) =>
                  card.id === tempId
                    ? {
                        id: createdCard.id,
                        title: createdCard.title,
                        description: createdCard.description,
                        position: createdCard.position,
                      }
                    : card
                ),
              }
            : column
        )
      )
    } catch (error) {
      console.error('Create card failed:', error)

      setColumns((currentColumns) =>
        currentColumns.map((column) =>
          column.id === columnId
            ? { ...column, cards: column.cards.filter((card) => card.id !== tempId) }
            : column
        )
      )
    }
  }

  async function handleDeleteCard(
    cardId: string,
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    let removedCard: Card | null = null
    let removedColumnId: string | null = null
    let removedIndex = -1

    setColumns((currentColumns) =>
      currentColumns.map((column) => {
        const cardIndex = column.cards.findIndex((card) => card.id === cardId)

        if (cardIndex === -1) {
          return column
        }

        removedCard = column.cards[cardIndex]
        removedColumnId = column.id
        removedIndex = cardIndex

        return {
          ...column,
          cards: column.cards.filter((card) => card.id !== cardId),
        }
      })
    )

    try {
      await deleteCard(formData)
    } catch (error) {
      console.error('Delete card failed:', error)

      if (!removedCard || !removedColumnId) {
        return
      }

      setColumns((currentColumns) =>
        currentColumns.map((column) => {
          if (column.id !== removedColumnId) {
            return column
          }

          const restoredCards = [...column.cards]
          restoredCards.splice(removedIndex, 0, removedCard as Card)

          return { ...column, cards: restoredCards }
        })
      )
    }
  }

  async function handleUpdateCard(
    cardId: string,
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const title = formData.get('title')?.toString().trim()
    const description = formData.get('description')?.toString().trim() || null

    if (!title) {
      return
    }

    const snapshot = columns

    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: col.cards.map((card) =>
          card.id === cardId ? { ...card, title, description } : card
        ),
      }))
    )

    try {
      await updateCard(formData)
    } catch (error) {
      console.error('Update card failed:', error)
      setColumns(snapshot)
    }
  }

  async function handleCreateColumn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const title = formData.get('title')?.toString().trim()

    if (!title) {
      return
    }

    const tempId = createTemporaryId()
    const optimisticColumn: Column = {
      id: tempId,
      title,
      position: columns.length,
      cards: [],
    }

    setColumns((prev) => [...prev, optimisticColumn])
    setShowAddColumn(false)

    try {
      const created = await createColumn(formData)

      if (!created) {
        throw new Error('Column could not be created')
      }

      setColumns((prev) =>
        prev.map((col) => (col.id === tempId ? { ...col, id: created.id } : col))
      )
    } catch (error) {
      console.error('Create column failed:', error)
      setColumns((prev) => prev.filter((col) => col.id !== tempId))
    }
  }

  async function handleUpdateColumn(columnId: string, title: string) {
    const snapshot = columns

    setColumns((prev) =>
      prev.map((col) => (col.id === columnId ? { ...col, title } : col))
    )

    const formData = new FormData()
    formData.set('columnId', columnId)
    formData.set('boardId', boardId)
    formData.set('title', title)

    try {
      await updateColumn(formData)
    } catch (error) {
      console.error('Update column failed:', error)
      setColumns(snapshot)
    }
  }

  async function handleDeleteColumn(columnId: string) {
    const snapshot = columns

    setColumns((prev) => prev.filter((col) => col.id !== columnId))

    const formData = new FormData()
    formData.set('columnId', columnId)
    formData.set('boardId', boardId)

    try {
      await deleteColumn(formData)
    } catch (error) {
      console.error('Delete column failed:', error)
      setColumns(snapshot)
    }
  }

  async function handleMoveCardToColumn(cardId: string, targetColumnId: string) {
    let sourceColumnId: string | null = null

    for (const col of columns) {
      if (col.cards.some((c) => c.id === cardId)) {
        sourceColumnId = col.id
        break
      }
    }

    if (!sourceColumnId || sourceColumnId === targetColumnId) return

    const sourceColumn = columns.find((c) => c.id === sourceColumnId)!
    const targetColumn = columns.find((c) => c.id === targetColumnId)!
    const activeCard = sourceColumn.cards.find((c) => c.id === cardId)!
    const sourceCards = sourceColumn.cards.filter((c) => c.id !== cardId)
    const nextTargetCards = [...targetColumn.cards, activeCard]

    const snapshot = columns

    setColumns((prev) =>
      prev.map((col) => {
        if (col.id === sourceColumnId) {
          return { ...col, cards: sourceCards.map((c, i) => ({ ...c, position: i })) }
        }
        if (col.id === targetColumnId) {
          return { ...col, cards: nextTargetCards.map((c, i) => ({ ...c, position: i })) }
        }
        return col
      })
    )

    try {
      await moveCard({
        boardId,
        cardId,
        targetColumnId,
        orderedCardIds: nextTargetCards.map((c) => c.id),
        sourceColumnId,
        sourceOrderedCardIds: sourceCards.map((c) => c.id),
      })
    } catch (error) {
      console.error('Move card to column failed:', error)
      setColumns(snapshot)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm text-slate-500">Board</p>
            <h1 className="text-xl font-bold">{boardTitle}</h1>
          </div>

          <a
            href="/dashboard"
            className="text-sm text-slate-600 hover:text-slate-950"
          >
            Back to dashboard
          </a>
        </div>
      </header>

      <DndContext
        id={`board-${boardId}`}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="mx-auto max-w-6xl px-4 py-8">
          <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
            {activeDragCard ? (
              <div className="w-72 rounded-xl border bg-slate-50 p-3 shadow-2xl rotate-2 opacity-95">
                <h3 className="font-medium break-words">{activeDragCard.title}</h3>
                {activeDragCard.description ? (
                  <p className="mt-1 text-sm text-slate-600 break-words">{activeDragCard.description}</p>
                ) : null}
              </div>
            ) : null}
          </DragOverlay>

          <div className="flex gap-4 overflow-x-auto pb-4 items-start">
            {columns.map((column) => (
              <div key={column.id} className="w-72 shrink-0">
                <DroppableColumn
                  column={column}
                  boardId={boardId}
                  allColumns={columns.map((c) => ({ id: c.id, title: c.title }))}
                  activeDragSourceColumnId={activeDragSourceColumnId}
                  activeDragOverColumnId={activeDragOverColumnId}
                  onCreateCard={handleCreateCard}
                  onDeleteCard={handleDeleteCard}
                  onUpdateCard={handleUpdateCard}
                  onUpdateColumn={handleUpdateColumn}
                  onDeleteColumn={handleDeleteColumn}
                  onMoveCardToColumn={handleMoveCardToColumn}
                />
              </div>
            ))}

            <div className="w-72 shrink-0">
              {showAddColumn ? (
                <form
                  onSubmit={handleCreateColumn}
                  className="rounded-2xl border bg-white p-4 shadow-sm space-y-2"
                >
                  <input type="hidden" name="boardId" value={boardId} />
                  <input
                    name="title"
                    placeholder="Column title"
                    required
                    maxLength={100}
                    autoFocus
                    className="w-full rounded-lg border bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-300"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Add column
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddColumn(false)}
                      className="rounded-lg border px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddColumn(true)}
                  className="flex h-24 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span className="text-sm font-medium">Add column</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </DndContext>
    </main>
  )
}
