import type { PlasmoMessaging } from "@plasmohq/messaging";
import { saveNote, deleteNote } from "~/lib/storage";

export interface SaveNoteRequestBody {
  productId: string;
  text: string | null; // null means delete
}

export interface SaveNoteResponseBody {
  success: boolean;
  error?: string;
}

const handler: PlasmoMessaging.MessageHandler<
  SaveNoteRequestBody,
  SaveNoteResponseBody
> = async (req, res) => {
  const { productId, text } = req.body!;

  try {
    if (text === null) {
      // Delete note
      await deleteNote(productId);
    } else {
      // Save/update note
      await saveNote(productId, text);
    }
    res.send({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.send({ success: false, error: message });
  }
};

export default handler;
