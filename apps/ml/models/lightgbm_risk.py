"""
LightGBM Risk Assessment Classifier — TIER 1
Dead stock ehtimolini bashorat qiladi.
Output: risk_score (0-1), risk_level (low/medium/high/critical)
"""

import os
import pickle
import logging
import numpy as np
from typing import Optional

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'saved_models', 'lightgbm_risk.pkl')


def predict(product_id: int, snapshots: Optional[list] = None) -> dict:
    """
    Rule-based risk assessment (ML model train qilinmaguncha).
    snapshots: [{'weekly_bought': int, 'score': float, 'snapshot_at': str}, ...]
    """
    snaps = sorted(snapshots or [], key=lambda x: x.get('snapshot_at', ''))
    if len(snaps) < 3:
        return {
            'product_id': product_id,
            'model': 'rule_based',
            'risk_score': 0.0,
            'risk_level': 'unknown',
            'reason': 'Not enough snapshots',
        }

    wb_series = [max(0, int(s.get('weekly_bought', 0) or 0)) for s in snaps]
    score_series = [float(s.get('score', 0) or 0) for s in snaps]

    # Rule-based signals
    recent_wb = wb_series[-3:]
    avg_wb = np.mean(wb_series)
    declining_wb = all(recent_wb[i] <= recent_wb[i - 1] for i in range(1, len(recent_wb)))
    zero_wb = sum(1 for w in wb_series[-7:] if w == 0) >= 3
    score_drop = (score_series[-1] - score_series[0]) / max(score_series[0], 0.001) if score_series[0] > 0 else 0

    risk_score = 0.0
    reasons = []

    if zero_wb:
        risk_score += 0.4
        reasons.append('Haftalik sotuv 0')
    if declining_wb:
        risk_score += 0.25
        reasons.append('Sotuv kamaymoqda')
    if avg_wb < 2:
        risk_score += 0.15
        reasons.append("O'rtacha sotuv juda past")
    if score_drop < -0.2:
        risk_score += 0.2
        reasons.append('Score tushmoqda')

    risk_score = min(1.0, risk_score)

    if risk_score >= 0.75:
        risk_level = 'critical'
    elif risk_score >= 0.5:
        risk_level = 'high'
    elif risk_score >= 0.25:
        risk_level = 'medium'
    else:
        risk_level = 'low'

    return {
        'product_id': product_id,
        'model': 'rule_based',
        'risk_score': round(risk_score, 2),
        'risk_level': risk_level,
        'reason': ', '.join(reasons) if reasons else 'No significant risk signals',
    }
