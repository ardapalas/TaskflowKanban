"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";


export async function createCard(formData: FormData) {
  const supabase = await createClient();

  const columnId = formData.get("columnId")?.toString();
  const boardId = formData.get("boardId")?.toString();
  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim();

  if (!columnId || !boardId || !title) {
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { count, error: countError } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("column_id", columnId);

  if (countError) {
    console.error("Card count error:", countError);
    throw new Error(countError.message);
  }

  const { data: card, error } = await supabase
    .from("cards")
    .insert({
      column_id: columnId,
      title,
      description: description || null,
      position: count ?? 0,
    })
    .select("id, title, description, position, column_id")
    .single();

  if (error || !card) {
    console.error("Create card error:", error);
    throw new Error(error?.message ?? "Card could not be created");
  }

  revalidatePath(`/board/${boardId}`);

  return card;
}

export async function createCardFallback(formData: FormData) {
  await createCard(formData);
}

export async function deleteCard(formData: FormData) {
  const supabase = await createClient();

  const cardId = formData.get("cardId")?.toString();
  const boardId = formData.get("boardId")?.toString();

  if (!cardId || !boardId) {
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: deletedCard, error } = await supabase
    .from("cards")
    .delete()
    .eq("id", cardId)
    .select("id")
    .single();

  if (error || !deletedCard) {
    console.error("Delete card error:", error);
    throw new Error(error?.message ?? "Card could not be deleted");
  }

  revalidatePath(`/board/${boardId}`);

  return deletedCard;
}

export async function deleteCardFallback(formData: FormData) {
  await deleteCard(formData);
}

export async function updateCard(formData: FormData) {
  const supabase = await createClient();

  const cardId = formData.get("cardId")?.toString();
  const boardId = formData.get("boardId")?.toString();
  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim();

  if (!cardId || !boardId || !title) {
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("cards")
    .update({
      title,
      description: description || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cardId);

  if (error) {
    console.error("Update card error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/board/${boardId}`);
}

type MoveCardInput = {
  boardId: string
  cardId: string
  targetColumnId: string
  orderedCardIds: string[]
  sourceColumnId: string
  sourceOrderedCardIds: string[]
}

export async function moveCard(input: MoveCardInput) {
  const supabase = await createClient()

  const {
    boardId,
    cardId,
    targetColumnId,
    orderedCardIds,
    sourceColumnId,
    sourceOrderedCardIds,
  } = input

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error: moveError } = await supabase
    .from('cards')
    .update({
      column_id: targetColumnId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cardId)

  if (moveError) {
    console.error('Move card error:', moveError)
    throw new Error(moveError.message)
  }

  const targetUpdates = orderedCardIds.map((id, index) =>
    supabase.from('cards').update({ position: index }).eq('id', id)
  )

  const sourceUpdates =
    sourceColumnId === targetColumnId
      ? []
      : sourceOrderedCardIds.map((id, index) =>
          supabase.from('cards').update({ position: index }).eq('id', id)
        )

  const results = await Promise.all([...targetUpdates, ...sourceUpdates])

  const failedUpdate = results.find((result) => result.error)

  if (failedUpdate?.error) {
    console.error('Update card positions error:', failedUpdate.error)
    throw new Error(failedUpdate.error.message)
  }

  if (sourceColumnId !== targetColumnId) {
    const [{ data: fromCol }, { data: toCol }] = await Promise.all([
      supabase.from('columns').select('title').eq('id', sourceColumnId).single(),
      supabase.from('columns').select('title').eq('id', targetColumnId).single(),
    ])

    const { error: activityError } = await supabase.from('card_activities').insert({
      card_id: cardId,
      from_column_id: sourceColumnId,
      to_column_id: targetColumnId,
      from_column_title: fromCol?.title ?? null,
      to_column_title: toCol?.title ?? null,
    })

    if (activityError) {
      console.error('Activity log error:', JSON.stringify(activityError))
    }
  }

  revalidatePath(`/board/${boardId}`)
}

export async function createColumn(formData: FormData) {
  const supabase = await createClient()

  const boardId = formData.get('boardId')?.toString()
  const title = formData.get('title')?.toString().trim()

  if (!boardId || !title) {
    return
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { count } = await supabase
    .from('columns')
    .select('id', { count: 'exact', head: true })
    .eq('board_id', boardId)

  const { data: column, error } = await supabase
    .from('columns')
    .insert({ board_id: boardId, title, position: count ?? 0 })
    .select('id, title, position')
    .single()

  if (error || !column) {
    console.error('Create column error:', error)
    throw new Error(error?.message ?? 'Column could not be created')
  }

  revalidatePath(`/board/${boardId}`)
  return column
}

export async function updateColumn(formData: FormData) {
  const supabase = await createClient()

  const columnId = formData.get('columnId')?.toString()
  const boardId = formData.get('boardId')?.toString()
  const title = formData.get('title')?.toString().trim()

  if (!columnId || !boardId || !title) {
    return
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('columns')
    .update({ title })
    .eq('id', columnId)

  if (error) {
    console.error('Update column error:', error)
    throw new Error(error.message)
  }

  revalidatePath(`/board/${boardId}`)
}

export async function deleteColumn(formData: FormData) {
  const supabase = await createClient()

  const columnId = formData.get('columnId')?.toString()
  const boardId = formData.get('boardId')?.toString()

  if (!columnId || !boardId) {
    return
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('columns')
    .delete()
    .eq('id', columnId)

  if (error) {
    console.error('Delete column error:', error)
    throw new Error(error.message)
  }

  revalidatePath(`/board/${boardId}`)
}

export type Activity = {
  id: string
  from_column_title: string | null
  to_column_title: string | null
  moved_at: string
}

export async function getCardActivities(cardId: string): Promise<Activity[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data } = await supabase
    .from('card_activities')
    .select('id, from_column_title, to_column_title, moved_at')
    .eq('card_id', cardId)
    .order('moved_at', { ascending: false })
    .limit(5)

  return (data ?? []) as Activity[]
}
