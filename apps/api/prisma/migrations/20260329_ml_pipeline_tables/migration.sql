-- Migration: 20260329_ml_pipeline_tables
-- T-478: Add ML Pipeline tables — CategoryMetricSnapshot, MlPrediction, MlAuditLog

-- 1. Kategoriya kunlik metrikalari — ML Model 5 + trend tahlili uchun
CREATE TABLE "category_metric_snapshots" (
    "id"            TEXT        NOT NULL,
    "category_id"   BIGINT      NOT NULL,
    "product_count" INTEGER     NOT NULL,
    "seller_count"  INTEGER     NOT NULL,
    "avg_score"     DECIMAL(8,4) NOT NULL,
    "avg_weekly_sold" DOUBLE PRECISION NOT NULL,
    "total_orders"  BIGINT      NOT NULL,
    "avg_price"     BIGINT      NOT NULL,
    "snapshot_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "category_metric_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "category_metric_snapshots_category_id_snapshot_at_idx"
    ON "category_metric_snapshots"("category_id", "snapshot_at");

-- 2. ML prognoz natijalari cache — frontend tez olish uchun
CREATE TABLE "ml_predictions" (
    "id"           TEXT         NOT NULL,
    "product_id"   BIGINT       NOT NULL,
    "model_name"   VARCHAR(50)  NOT NULL,
    "metric"       VARCHAR(30)  NOT NULL,
    "horizon_days" INTEGER      NOT NULL,
    "predictions"  JSONB        NOT NULL,
    "mae"          DOUBLE PRECISION,
    "mape"         DOUBLE PRECISION,
    "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT "ml_predictions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ml_predictions_product_id_model_name_metric_idx"
    ON "ml_predictions"("product_id", "model_name", "metric");

-- 3. ML prognoz vs real solishtirish — audit va drift detection uchun
CREATE TABLE "ml_audit_logs" (
    "id"               TEXT         NOT NULL,
    "product_id"       BIGINT       NOT NULL,
    "model_name"       VARCHAR(50)  NOT NULL,
    "metric"           VARCHAR(30)  NOT NULL,
    "predicted_value"  DOUBLE PRECISION NOT NULL,
    "actual_value"     DOUBLE PRECISION NOT NULL,
    "error_abs"        DOUBLE PRECISION NOT NULL,
    "error_pct"        DOUBLE PRECISION NOT NULL,
    "prediction_date"  TIMESTAMPTZ  NOT NULL,
    "actual_date"      TIMESTAMPTZ  NOT NULL,
    "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT "ml_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ml_audit_logs_model_name_created_at_idx"
    ON "ml_audit_logs"("model_name", "created_at");

CREATE INDEX "ml_audit_logs_product_id_created_at_idx"
    ON "ml_audit_logs"("product_id", "created_at");
