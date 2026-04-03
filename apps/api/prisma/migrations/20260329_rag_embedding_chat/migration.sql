-- Migration: 20260329_rag_embedding_chat
-- T-484: ProductEmbedding + ChatConversation + ChatMessage + pgvector HNSW index

-- pgvector extension (Railway PostgreSQL da mavjud, agar yo'q bo'lsa yaratadi)
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Product embedding — pgvector RAG semantic search uchun
CREATE TABLE IF NOT EXISTS "product_embeddings" (
    "id"         TEXT        NOT NULL,
    "product_id" BIGINT      NOT NULL,
    "content"    TEXT        NOT NULL,
    "embedding"  vector(1536),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "product_embeddings_pkey"        PRIMARY KEY ("id"),
    CONSTRAINT "product_embeddings_product_id_key" UNIQUE ("product_id")
);

-- HNSW index — ANN qidirish uchun (cosine distance)
-- ef_construction=64, m=16 → yaxshi precision/speed balans
CREATE INDEX IF NOT EXISTS "product_embeddings_embedding_hnsw_idx"
    ON "product_embeddings"
    USING hnsw ("embedding" vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- 2. Enum turlari
CREATE TYPE IF NOT EXISTS "ChatRole"     AS ENUM ('USER', 'ASSISTANT');
CREATE TYPE IF NOT EXISTS "ChatFeedback" AS ENUM ('UP', 'DOWN');

-- 3. Chat suhbat — RAG chat tarixi uchun
CREATE TABLE IF NOT EXISTS "chat_conversations" (
    "id"         TEXT        NOT NULL,
    "account_id" TEXT        NOT NULL,
    "user_id"    TEXT        NOT NULL,
    "title"      TEXT,
    "is_active"  BOOLEAN     NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "chat_conversations_account_id_updated_at_idx"
    ON "chat_conversations"("account_id", "updated_at" DESC);

CREATE INDEX IF NOT EXISTS "chat_conversations_user_id_idx"
    ON "chat_conversations"("user_id");

-- 4. Chat xabarlari — har bir turn (user/assistant)
CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id"              TEXT        NOT NULL,
    "conversation_id" TEXT        NOT NULL,
    "role"            "ChatRole"  NOT NULL,
    "content"         TEXT        NOT NULL,
    "context_json"    JSONB,
    "intent"          TEXT,
    "product_ids"     BIGINT[]    NOT NULL DEFAULT '{}',
    "model"           TEXT,
    "input_tokens"    INTEGER,
    "output_tokens"   INTEGER,
    "cost_usd"        DECIMAL(10, 6),
    "feedback"        "ChatFeedback",
    "feedback_text"   TEXT,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "chat_messages_pkey"              PRIMARY KEY ("id"),
    CONSTRAINT "chat_messages_conversation_fkey" FOREIGN KEY ("conversation_id")
        REFERENCES "chat_conversations"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "chat_messages_conversation_id_created_at_idx"
    ON "chat_messages"("conversation_id", "created_at");

-- FK: chat_conversations → accounts, users (agar tablalar mavjud bo'lsa)
ALTER TABLE "chat_conversations"
    ADD CONSTRAINT "chat_conversations_account_id_fkey"
        FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "chat_conversations_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
