'use client'

import { FormEvent, useState, useSyncExternalStore } from 'react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
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
import { createCard, deleteCard, updateCard, moveCard } from './actions'

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

function SortableCard({
  card,
  boardId,
  onDeleteCard,
}: {
  card: Card
  boardId: string
  onDeleteCard: (cardId: string, event: FormEvent<HTMLFormElement>) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      card,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border bg-slate-50 p-3 ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium">{card.title}</h3>

          {card.description ? (
            <p className="mt-1 text-sm text-slate-600">{card.description}</p>
          ) : null}
        </div>

        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab rounded-md border bg-white px-2 py-1 text-xs text-slate-500 active:cursor-grabbing"
          aria-label="Drag card"
        >
          Drag
        </button>
      </div>

      <form action={updateCard} className="space-y-2 border-t pt-3">
        <input type="hidden" name="cardId" value={card.id} />
        <input type="hidden" name="boardId" value={boardId} />

        <input
          name="title"
          defaultValue={card.title}
          required
          maxLength={100}
          className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        />

        <textarea
          name="description"
          defaultValue={card.description ?? ''}
          maxLength={500}
          className="min-h-16 w-full resize-none rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        />

        <button
          type="submit"
          className="text-xs font-medium text-slate-700 hover:text-slate-950"
        >
          Save
        </button>
      </form>

      <form
        onSubmit={(event) => onDeleteCard(card.id, event)}
        className="mt-2"
      >
        <input type="hidden" name="cardId" value={card.id} />
        <input type="hidden" name="boardId" value={boardId} />

        <button
          type="submit"
          className="text-xs font-medium text-red-600 hover:text-red-700"
        >
          Delete
        </button>
      </form>
    </article>
  )
}

function DroppableColumn({
  column,
  boardId,
  onCreateCard,
  onDeleteCard,
}: {
  column: Column
  boardId: string
  onCreateCard: (columnId: string, event: FormEvent<HTMLFormElement>) => void
  onDeleteCard: (cardId: string, event: FormEvent<HTMLFormElement>) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      columnId: column.id,
    },
  })

  return (
    <section
      ref={setNodeRef}
      className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
        isOver ? 'ring-2 ring-slate-400' : ''
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">{column.title}</h2>

        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
          {column.cards.length}
        </span>
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
                onDeleteCard={onDeleteCard}
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

function subscribe() {
  return () => {}
}

function getSnapshot() {
  return true
}

function getServerSnapshot() {
  return false
}

export function BoardClient({
  boardId,
  boardTitle,
  initialColumns,
}: BoardClientProps) {
  const [columns, setColumns] = useState(initialColumns)

  const mounted = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    })
  )

  if (!mounted) {
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

        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid gap-4 md:grid-cols-3">
            {columns.map((column) => (
              <section
                key={column.id}
                className="rounded-2xl border bg-white p-4 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold">{column.title}</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    {column.cards.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {column.cards.map((card) => (
                    <article
                      key={card.id}
                      className="rounded-xl border bg-slate-50 p-3"
                    >
                      <h3 className="font-medium">{card.title}</h3>
                      {card.description ? (
                        <p className="mt-1 text-sm text-slate-600">
                          {card.description}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    )
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
    const tempId = `temp-${crypto.randomUUID()}`

    const optimisticCard: Card = {
      id: tempId,
      title,
      description: description || null,
      position,
    }

    setColumns((currentColumns) =>
      currentColumns.map((column) =>
        column.id === columnId
          ? {
              ...column,
              cards: [...column.cards, optimisticCard],
            }
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
            ? {
                ...column,
                cards: column.cards.filter((card) => card.id !== tempId),
              }
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

    const form = event.currentTarget
    const formData = new FormData(form)

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

          return {
            ...column,
            cards: restoredCards,
          }
        })
      )
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
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
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="mx-auto max-w-6xl px-4 py-8">
          {columns.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {columns.map((column) => (
                <DroppableColumn
                  key={column.id}
                  column={column}
                  boardId={boardId}
                  onCreateCard={handleCreateCard}
                  onDeleteCard={handleDeleteCard}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
              <h2 className="text-lg font-semibold">No columns yet</h2>
              <p className="mt-2 text-sm text-slate-600">
                This board does not have any columns yet.
              </p>
            </div>
          )}
        </div>
      </DndContext>
    </main>
  )
}