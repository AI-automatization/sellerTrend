import { useEffect, useState } from "react";
import { isFavorite, getNote, saveNote, deleteNote, addFavorite, removeFavorite } from "~/lib/storage";

interface ProductNotesProps {
  productId: string;
  onNotesChange?: () => void;
}

export default function ProductNotes({ productId, onNotesChange }: ProductNotesProps) {
  const [isFav, setIsFav] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load initial state
  useEffect(() => {
    async function loadState() {
      setLoading(true);
      const fav = await isFavorite(productId);
      const note = await getNote(productId);
      setIsFav(fav);
      setNoteText(note?.text ?? "");
      setLoading(false);
    }
    loadState();
  }, [productId]);

  const handleToggleFavorite = async () => {
    const newIsFav = !isFav;
    setIsFav(newIsFav);
    try {
      if (newIsFav) {
        await addFavorite(productId);
      } else {
        await removeFavorite(productId);
      }
    } catch (err) {
      console.error("Failed to update favorite:", err);
      setIsFav(!newIsFav); // Revert on error
    }
  };

  const handleSaveNote = async () => {
    if (noteText.trim() === "" && !isEditing) return;

    try {
      const textToSave = noteText.trim();
      if (textToSave) {
        await saveNote(productId, textToSave);
      } else {
        await deleteNote(productId);
      }
      setIsEditing(false);
      onNotesChange?.();
    } catch (err) {
      console.error("Failed to save note:", err);
    }
  };

  if (loading) {
    return <div className="text-xs text-base-content/60">Yukllanmoqda...</div>;
  }

  return (
    <div className="space-y-2">
      {/* Favorite Button */}
      <button
        onClick={handleToggleFavorite}
        className={`btn btn-sm w-full ${
          isFav
            ? "btn-warning"
            : "btn-outline"
        }`}
      >
        {isFav ? "⭐ Sevimlilarda" : "☆ Sevimlilarga qo'shish"}
      </button>

      {/* Notes Section */}
      <div className="bg-base-200 rounded-lg p-3">
        <div className="text-xs font-semibold mb-2">📝 Eslatma</div>

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Mahsulot haqida qadichcha yozib qo'yish..."
              className="textarea textarea-bordered textarea-sm w-full h-20 text-xs"
            />
            <div className="flex gap-1">
              <button
                onClick={handleSaveNote}
                className="btn btn-primary btn-xs flex-1"
              >
                Saqlash
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  // Reset to original
                  getNote(productId).then((note) => {
                    setNoteText(note?.text ?? "");
                  });
                }}
                className="btn btn-ghost btn-xs flex-1"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        ) : (
          <div>
            {noteText ? (
              <div className="bg-base-100 rounded p-2 text-xs mb-2 line-clamp-3">
                {noteText}
              </div>
            ) : (
              <div className="text-xs text-base-content/60 mb-2">Eslatma yo'q</div>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-ghost btn-xs w-full text-xs"
            >
              {noteText ? "✏️ O'zgartirish" : "➕ Eslatma qo'shish"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
