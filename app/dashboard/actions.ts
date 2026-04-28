"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createBoard(formData: FormData) {
  const supabase = await createClient();

  const title = formData.get("title")?.toString().trim();

  if (!title) {
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: board, error: boardError } = await supabase
    .from("boards")
    .insert({
      title,
      user_id: user.id,
    })
    .select("id")
    .single();

  if (boardError || !board) {
    console.error("Create board error:", boardError);
    throw new Error(boardError?.message ?? "Board could not be created");
  }

  const { error: columnsError } = await supabase.from("columns").insert([
    {
      board_id: board.id,
      title: "To Do",
      position: 0,
    },
    {
      board_id: board.id,
      title: "In Progress",
      position: 1,
    },
    {
      board_id: board.id,
      title: "Done",
      position: 2,
    },
  ]);

  if (columnsError) {
    console.error("Create default columns error:", columnsError);
    throw new Error(columnsError.message);
  }

  revalidatePath("/dashboard");
  redirect(`/board/${board.id}`);
}

export async function deleteBoard(formData: FormData) {
  const supabase = await createClient();

  const boardId = formData.get("boardId")?.toString();
  if (!boardId) return;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("boards")
    .delete()
    .eq("id", boardId);

  if (error) {
    console.error("Delete board error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}