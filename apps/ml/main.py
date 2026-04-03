"""
VENTRA ML Service — FastAPI
Port: 8000
Endpointlar:
  POST /predict/sales    — LightGBM yoki Chronos (horizon kunlik prognoz)
  POST /batch/predict    — Batch inference (1000 talik)
  POST /batch/retrain    — Model qayta train
  GET  /health           — Holat tekshirish
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

# ─── Pydantic schemas ──────────────────────────────────────────────────────────

class SnapshotItem(BaseModel):
    weekly_bought: int = 0
    score: float = 0.0
    snapshot_at: str = ''
    category_id: int = 0

class PredictSalesRequest(BaseModel):
    product_id: int
    horizon: int = Field(default=7, ge=1, le=90)
    snapshots: list[SnapshotItem] = []

class BatchPredictRequest(BaseModel):
    product_ids: list[int]
    horizon: int = Field(default=7, ge=1, le=90)
    snapshots_map: dict[str, list[SnapshotItem]] = {}  # product_id (str) → snapshots

class RetrainRequest(BaseModel):
    days: int = Field(default=90, ge=30, le=365)
    model_name: Optional[str] = None  # None → all models retrain

class CategorySnapshotItem(BaseModel):
    snapshot_at: str
    avg_weekly_sold: float = 0.0

class PredictSeasonalRequest(BaseModel):
    category_id: int
    horizon: int = Field(default=14, ge=1, le=90)
    snapshots: list[CategorySnapshotItem] = []

# ─── App lifecycle ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info('VENTRA ML Service starting...')
    yield
    logger.info('VENTRA ML Service stopping...')

app = FastAPI(title='VENTRA ML Service', version='1.0.0', lifespan=lifespan)

# ─── Endpoints ─────────────────────────────────────────────────────────────────

@app.get('/health')
def health():
    from models import lightgbm_sales
    import os
    model_exists = os.path.exists(lightgbm_sales.MODEL_PATH)
    return {
        'status': 'ok',
        'model_trained': model_exists,
        'service': 'ventra-ml',
    }

@app.post('/predict/sales')
def predict_sales(req: PredictSalesRequest):
    """
    Bitta product uchun sotuv prognozi.
    30+ snapshot bo'lsa → LightGBM, aks holda Chronos.
    """
    snaps = [s.model_dump() for s in req.snapshots]
    use_chronos = len(snaps) < 30

    if use_chronos:
        from models.chronos_fallback import predict as chronos_predict
        result = chronos_predict(req.product_id, horizon=req.horizon, snapshots=snaps)
    else:
        from models.lightgbm_sales import predict as lgb_predict
        result = lgb_predict(req.product_id, horizon=req.horizon, snapshots=snaps)

    if 'error' in result:
        # LightGBM xato bersa Chronos ga fallback
        if not use_chronos:
            from models.chronos_fallback import predict as chronos_predict
            result = chronos_predict(req.product_id, horizon=req.horizon, snapshots=snaps)
        if 'error' in result:
            raise HTTPException(status_code=500, detail=result['error'])

    return result

@app.post('/predict/risk')
def predict_risk(req: PredictSalesRequest):
    """
    Product uchun risk assessment (dead stock ehtimoli).
    """
    snaps = [s.model_dump() for s in req.snapshots]
    from models.lightgbm_risk import predict as risk_predict
    result = risk_predict(req.product_id, snapshots=snaps)
    if 'error' in result:
        raise HTTPException(status_code=500, detail=result['error'])
    return result

@app.post('/predict/seasonal')
def predict_seasonal(req: PredictSeasonalRequest):
    """
    Kategoriya uchun mavsumiy prognoz (NeuralProphet/Fourier decomposition).
    O'zbek bayramlari (Navro'z, Ramadan, Yangi yil) regressors sifatida.
    """
    snaps = [s.model_dump() for s in req.snapshots]
    from models.neuralprophet_category import predict_category
    result = predict_category(req.category_id, horizon=req.horizon, snapshots=snaps)
    if 'error' in result:
        raise HTTPException(status_code=500, detail=result['error'])
    return result

@app.post('/batch/predict')
def batch_predict(req: BatchPredictRequest):
    """
    Batch inference — 1000 talik product uchun prognoz.
    """
    if len(req.product_ids) > 2000:
        raise HTTPException(status_code=400, detail='Max 2000 products per batch')

    results = []
    for pid in req.product_ids:
        snaps = [s.model_dump() for s in req.snapshots_map.get(str(pid), [])]
        use_chronos = len(snaps) < 30

        if use_chronos:
            from models.chronos_fallback import predict as chronos_predict
            result = chronos_predict(pid, horizon=req.horizon, snapshots=snaps)
        else:
            from models.lightgbm_sales import predict as lgb_predict
            result = lgb_predict(pid, horizon=req.horizon, snapshots=snaps)

        if 'error' in result and not use_chronos:
            from models.chronos_fallback import predict as chronos_predict
            result = chronos_predict(pid, horizon=req.horizon, snapshots=snaps)

        results.append(result)

    return {'results': results, 'total': len(results)}

@app.post('/batch/retrain')
def batch_retrain(req: RetrainRequest):
    """
    LightGBM + NeuralProphet modellarni qayta train qilish.
    """
    from models.lightgbm_sales import train as lgb_train
    lgb_result = lgb_train(days=req.days)
    if 'error' in lgb_result:
        raise HTTPException(status_code=500, detail=lgb_result['error'])

    # NeuralProphet kategoriya modellari — har kategoriya uchun alohida
    # DB dan category_metric_snapshots ni o'qib train qilish
    np_trained = 0
    np_errors = 0
    try:
        import os
        from sqlalchemy import create_engine, text
        db_url = os.getenv('DATABASE_URL', '')
        if db_url.startswith('postgresql://'):
            db_url = db_url.replace('postgresql://', 'postgresql+psycopg2://', 1)
        if db_url:
            engine = create_engine(db_url)
            with engine.connect() as conn:
                rows = conn.execute(text("""
                    SELECT category_id, snapshot_at, avg_weekly_sold
                    FROM category_metric_snapshots
                    WHERE snapshot_at >= NOW() - INTERVAL ':days days'
                    ORDER BY category_id, snapshot_at
                """), {'days': req.days}).fetchall()

            # Kategoriya bo'yicha guruhlash
            from itertools import groupby
            from models.neuralprophet_category import train_category
            rows_sorted = sorted(rows, key=lambda r: r[0])
            for cat_id, group in groupby(rows_sorted, key=lambda r: r[0]):
                snaps = [
                    {'snapshot_at': r[1].isoformat(), 'avg_weekly_sold': float(r[2])}
                    for r in group
                ]
                result = train_category(int(cat_id), snaps)
                if 'error' in result:
                    np_errors += 1
                else:
                    np_trained += 1
    except Exception as e:
        logger.warning(f'NeuralProphet batch retrain error: {e}')

    return {
        **lgb_result,
        'neuralprophet': {'trained': np_trained, 'errors': np_errors},
    }

@app.get('/audit/summary')
def audit_summary():
    """
    Model aniqlik hisoboti (MlAuditLog dan).
    """
    import os
    from sqlalchemy import create_engine, text
    db_url = os.getenv('DATABASE_URL', '')
    if db_url.startswith('postgresql://'):
        db_url = db_url.replace('postgresql://', 'postgresql+psycopg2://', 1)
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            row = conn.execute(text("""
                SELECT
                    model_name,
                    AVG(error_pct) AS avg_mape,
                    AVG(CASE WHEN actual_value > 0 AND
                        (predicted_value > actual_value) = (predicted_value > LAG(actual_value)
                            OVER (PARTITION BY model_name ORDER BY actual_date))
                        THEN 1.0 ELSE 0.0 END) AS direction_accuracy,
                    COUNT(*) AS audit_count
                FROM ml_audit_logs
                WHERE actual_date >= NOW() - INTERVAL '7 days'
                GROUP BY model_name
            """)).fetchall()
        return {
            'models': [
                {
                    'model_name': r[0],
                    'avg_mape': round(float(r[1] or 0), 1),
                    'direction_accuracy': round(float(r[2] or 0) * 100, 1),
                    'audit_count': r[3],
                }
                for r in row
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=False)
