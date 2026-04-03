"""
Chronos Zero-Shot Fallback — TIER 3
30 dan kam snapshot bo'lgan yangi productlar uchun.
Train shart emas — pretrained Amazon Chronos modeli.
"""

import logging
import numpy as np
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

_chronos_pipeline = None


def _get_pipeline():
    """Chronos pipeline lazy load."""
    global _chronos_pipeline
    if _chronos_pipeline is not None:
        return _chronos_pipeline

    try:
        import torch
        from chronos import ChronosPipeline

        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        _chronos_pipeline = ChronosPipeline.from_pretrained(
            'amazon/chronos-t5-tiny',
            device_map=device,
            torch_dtype=torch.float32,
        )
        logger.info(f'Chronos pipeline loaded on {device}')
        return _chronos_pipeline
    except ImportError:
        logger.warning('Chronos not installed — using simple heuristic fallback')
        return None
    except Exception as e:
        logger.warning(f'Chronos load failed: {e} — using heuristic fallback')
        return None


def _heuristic_predict(wb_series: list, horizon: int) -> list:
    """Chronos yo'q bo'lganda oddiy WMA prognoz."""
    if not wb_series:
        return [0.0] * horizon

    weights = np.arange(1, min(len(wb_series), 7) + 1, dtype=float)
    recent = wb_series[-len(weights):]
    wma = float(np.average(recent, weights=weights))
    wma = max(0, wma)

    return [round(wma + np.random.normal(0, wma * 0.05), 1) for _ in range(horizon)]


def predict(product_id: int, horizon: int = 7, snapshots: Optional[list] = None) -> dict:
    """
    Chronos zero-shot prognoz.
    snapshots: [{'weekly_bought': int, 'snapshot_at': str}, ...]
    """
    snaps = sorted(snapshots or [], key=lambda x: x.get('snapshot_at', ''))
    wb_series = [max(0, int(s.get('weekly_bought', 0) or 0)) for s in snaps]

    if not wb_series:
        wb_series = [0]

    pipeline = _get_pipeline()
    predictions_values = []

    if pipeline is not None:
        try:
            import torch
            context = torch.tensor(wb_series, dtype=torch.float32).unsqueeze(0)
            forecast = pipeline.predict(context, prediction_length=horizon)
            # forecast shape: [num_samples, batch, horizon]
            median_forecast = np.median(forecast[0].numpy(), axis=0)
            low_forecast = np.percentile(forecast[0].numpy(), 10, axis=0)
            high_forecast = np.percentile(forecast[0].numpy(), 90, axis=0)

            base_date = datetime.utcnow()
            predictions_list = []
            for i in range(horizon):
                pred_date = base_date + timedelta(days=i + 1)
                val = max(0, float(median_forecast[i]))
                predictions_list.append({
                    'date': pred_date.strftime('%Y-%m-%d'),
                    'value': round(val, 1),
                    'lower': round(max(0, float(low_forecast[i])), 1),
                    'upper': round(max(0, float(high_forecast[i])), 1),
                })

            avg_pred = np.mean([p['value'] for p in predictions_list])
            avg_actual = np.mean(wb_series[-min(7, len(wb_series)):])
            mae = abs(avg_pred - avg_actual)
            mape = (mae / max(avg_actual, 1)) * 100

            return {
                'product_id': product_id,
                'model': 'chronos',
                'horizon_days': horizon,
                'predictions': predictions_list,
                'mae': round(mae, 2),
                'mape': round(mape, 1),
            }
        except Exception as e:
            logger.warning(f'Chronos inference failed: {e}, falling back to heuristic')

    # Heuristic fallback
    preds = _heuristic_predict(wb_series, horizon)
    base_date = datetime.utcnow()
    predictions_list = []
    for i, val in enumerate(preds):
        pred_date = base_date + timedelta(days=i + 1)
        margin = val * 0.3
        predictions_list.append({
            'date': pred_date.strftime('%Y-%m-%d'),
            'value': round(max(0, val), 1),
            'lower': round(max(0, val - margin), 1),
            'upper': round(val + margin, 1),
        })

    avg_pred = np.mean([p['value'] for p in predictions_list])
    avg_actual = np.mean(wb_series[-min(7, len(wb_series)):])
    mae = abs(avg_pred - avg_actual)
    mape = (mae / max(avg_actual, 1)) * 100

    return {
        'product_id': product_id,
        'model': 'chronos_heuristic',
        'horizon_days': horizon,
        'predictions': predictions_list,
        'mae': round(mae, 2),
        'mape': round(mape, 1),
    }
