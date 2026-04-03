"""
LightGBM Global Sales Forecast Model — TIER 1
Barcha productlar uchun bitta global model.
Train: haftada 1x, 36.5M row → ~15-20 min
Inference: 100K product → ~30s
"""

import os
import pickle
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'saved_models', 'lightgbm_sales.pkl')
SCALER_PATH = os.path.join(os.path.dirname(__file__), '..', 'saved_models', 'lightgbm_sales_scaler.pkl')


def get_db_engine():
    db_url = os.getenv('DATABASE_URL', '')
    # psycopg2 uchun URL formati: postgresql+psycopg2://...
    if db_url.startswith('postgresql://'):
        db_url = db_url.replace('postgresql://', 'postgresql+psycopg2://', 1)
    return create_engine(db_url)


def load_training_data(engine, days: int = 90) -> pd.DataFrame:
    """product_snapshots dan feature engineering uchun ma'lumot olish."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    query = text("""
        SELECT
            ps.product_id,
            ps.snapshot_at::date                               AS snap_date,
            COALESCE(ps.weekly_bought, 0)                     AS weekly_bought,
            CAST(ps.score AS FLOAT)                           AS score,
            ps.orders_quantity,
            p.category_id,
            EXTRACT(DOW FROM ps.snapshot_at)::int             AS day_of_week,
            EXTRACT(MONTH FROM ps.snapshot_at)::int           AS month,
            LAG(COALESCE(ps.weekly_bought, 0), 7)
                OVER (PARTITION BY ps.product_id ORDER BY ps.snapshot_at) AS wb_lag7,
            LAG(COALESCE(ps.weekly_bought, 0), 14)
                OVER (PARTITION BY ps.product_id ORDER BY ps.snapshot_at) AS wb_lag14,
            LAG(COALESCE(ps.weekly_bought, 0), 30)
                OVER (PARTITION BY ps.product_id ORDER BY ps.snapshot_at) AS wb_lag30
        FROM product_snapshots ps
        JOIN products p ON p.id = ps.product_id
        WHERE ps.snapshot_at >= :cutoff
        ORDER BY ps.product_id, ps.snapshot_at
    """)
    df = pd.read_sql(query, engine, params={'cutoff': cutoff})
    df['category_id'] = df['category_id'].fillna(0).astype(int)
    df['wb_lag7'] = df['wb_lag7'].fillna(0)
    df['wb_lag14'] = df['wb_lag14'].fillna(0)
    df['wb_lag30'] = df['wb_lag30'].fillna(0)
    return df.dropna(subset=['weekly_bought'])


def get_feature_columns():
    return ['wb_lag7', 'wb_lag14', 'wb_lag30', 'score', 'category_id', 'day_of_week', 'month']


def train(days: int = 90) -> dict:
    """LightGBM global model train qilish."""
    try:
        import lightgbm as lgb
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import mean_absolute_error

        engine = get_db_engine()
        logger.info(f"Training data loading (last {days} days)...")
        df = load_training_data(engine, days=days)

        if len(df) < 1000:
            return {'error': f'Not enough data: {len(df)} rows (minimum 1000)'}

        features = get_feature_columns()
        X = df[features].values
        y = df['weekly_bought'].values

        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.1, random_state=42)

        params = {
            'objective': 'regression',
            'metric': 'mae',
            'num_leaves': 64,
            'learning_rate': 0.05,
            'feature_fraction': 0.8,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': -1,
            'n_jobs': -1,
        }

        train_data = lgb.Dataset(X_train, label=y_train)
        val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)

        model = lgb.train(
            params,
            train_data,
            num_boost_round=500,
            valid_sets=[val_data],
            callbacks=[lgb.early_stopping(50), lgb.log_evaluation(100)],
        )

        val_preds = model.predict(X_val)
        mae = mean_absolute_error(y_val, val_preds)
        mape = np.mean(np.abs((y_val - val_preds) / np.maximum(y_val, 1))) * 100

        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        with open(MODEL_PATH, 'wb') as f:
            pickle.dump(model, f)

        logger.info(f"Model trained: MAE={mae:.2f}, MAPE={mape:.1f}%, rows={len(df)}")
        return {'mae': round(mae, 2), 'mape': round(mape, 1), 'rows': len(df), 'features': features}

    except Exception as e:
        logger.error(f"Training failed: {e}")
        return {'error': str(e)}


def predict(product_id: int, horizon: int = 7, snapshots: Optional[list] = None) -> dict:
    """
    Berilgan product uchun horizon kunlik prognoz.
    snapshots: [{'weekly_bought': int, 'score': float, 'snapshot_at': str}, ...]
    """
    try:
        import lightgbm as lgb

        if not os.path.exists(MODEL_PATH):
            return {'error': 'Model not trained yet', 'model': 'lightgbm'}

        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)

        if not snapshots or len(snapshots) < 3:
            return {'error': 'Not enough snapshots (min 3)', 'model': 'lightgbm'}

        snaps = sorted(snapshots, key=lambda x: x.get('snapshot_at', ''))
        wb_series = [s.get('weekly_bought', 0) or 0 for s in snaps]
        last_score = float(snaps[-1].get('score', 0) or 0)
        category_id = int(snaps[-1].get('category_id', 0) or 0)

        wb_lag7 = wb_series[-7] if len(wb_series) >= 7 else wb_series[0]
        wb_lag14 = wb_series[-14] if len(wb_series) >= 14 else wb_series[0]
        wb_lag30 = wb_series[-30] if len(wb_series) >= 30 else wb_series[0]

        predictions = []
        base_date = datetime.utcnow()

        for day in range(1, horizon + 1):
            pred_date = base_date + timedelta(days=day)
            features = np.array([[
                wb_lag7, wb_lag14, wb_lag30,
                last_score, category_id,
                pred_date.weekday(),
                pred_date.month,
            ]])
            pred_value = float(model.predict(features)[0])
            pred_value = max(0, pred_value)
            margin = pred_value * 0.25

            predictions.append({
                'date': pred_date.strftime('%Y-%m-%d'),
                'value': round(pred_value, 1),
                'lower': round(max(0, pred_value - margin), 1),
                'upper': round(pred_value + margin, 1),
            })

        avg_pred = np.mean([p['value'] for p in predictions])
        avg_actual = np.mean(wb_series[-min(7, len(wb_series)):])
        mae = abs(avg_pred - avg_actual)
        mape = (mae / max(avg_actual, 1)) * 100

        return {
            'product_id': product_id,
            'model': 'lightgbm',
            'horizon_days': horizon,
            'predictions': predictions,
            'mae': round(mae, 2),
            'mape': round(mape, 1),
        }

    except Exception as e:
        logger.error(f"Prediction failed for product {product_id}: {e}")
        return {'error': str(e), 'model': 'lightgbm'}


def batch_predict(product_ids: list[int], horizon: int = 7, db_snapshots: Optional[dict] = None) -> list:
    """Bir nechta product uchun batch prognoz."""
    results = []
    for pid in product_ids:
        snaps = db_snapshots.get(pid, []) if db_snapshots else []
        result = predict(pid, horizon=horizon, snapshots=snaps)
        results.append(result)
    return results
