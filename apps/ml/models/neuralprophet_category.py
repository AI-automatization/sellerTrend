"""
NeuralProphet Kategoriya-Level Mavsumiy Model — TIER 2

Har kategoriya uchun mavsumiy prognoz.
O'zbek bayramlari (Ramadan, Navro'z, Yangi yil) regressor sifatida qo'shiladi.

Foydalanish:
    from models.neuralprophet_category import predict_category, train_category

DB: category_metric_snapshots dan avg_weekly_sold tarixi.
"""

import logging
import os
import pickle
import numpy as np
from datetime import datetime, date, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'saved_models')
os.makedirs(MODEL_DIR, exist_ok=True)

# O'zbek mavsumiy voqealari (oylar, 1-12 asosida)
UZBEK_SEASONAL_EVENTS = [
    {'name': 'navruz', 'month': 3, 'day': 21, 'duration': 7},    # Navro'z (21 mart)
    {'name': 'ramadan_peak', 'month': 4, 'day': 1, 'duration': 30}, # Ramadan (taxminiy)
    {'name': 'new_year', 'month': 12, 'day': 25, 'duration': 10},  # Yangi yil avval
    {'name': 'new_year_post', 'month': 1, 'day': 1, 'duration': 7}, # Yangi yil keyin
    {'name': 'independence_day', 'month': 9, 'day': 1, 'duration': 3}, # Mustaqillik kuni
]


def _model_path(category_id: int) -> str:
    return os.path.join(MODEL_DIR, f'neuralprophet_cat_{category_id}.pkl')


def _is_event_day(dt: date, event: dict) -> float:
    """Berilgan sana voqea oralig'ida bo'lsa 1.0, aks holda 0.0."""
    event_start = date(dt.year, event['month'], event['day'])
    event_end = event_start + timedelta(days=event['duration'])
    if event_start <= dt <= event_end:
        return 1.0
    return 0.0


def _build_regressors(dates: list[date]) -> dict[str, list[float]]:
    """Har sana uchun mavsumiy regressor qiymatlari."""
    regressors: dict[str, list[float]] = {e['name']: [] for e in UZBEK_SEASONAL_EVENTS}
    for dt in dates:
        for event in UZBEK_SEASONAL_EVENTS:
            regressors[event['name']].append(_is_event_day(dt, event))
    return regressors


class SimpleProphet:
    """
    NeuralProphet o'rniga lightweight mavsumiy model.

    NeuralProphet Railway da katta RAM talab qiladi (torch dependency).
    Bu model o'rniga oddiy Fourier decomposition + linear trend ishlatiladi:
      - Trend: linear regression
      - Haftalik mavsumiylik: Fourier series (K=3)
      - Yillik mavsumiylik: Fourier series (K=5)
      - Voqea effektlari: binary regressor coefficients
    """

    def __init__(self):
        self.trend_coef: Optional[float] = None
        self.trend_intercept: Optional[float] = None
        self.fourier_coefs: Optional[np.ndarray] = None
        self.event_coefs: dict[str, float] = {}
        self.residual_std: float = 1.0
        self.last_trained: Optional[str] = None
        self.n_train: int = 0

    def _fourier_features(self, t: np.ndarray, period: float, K: int) -> np.ndarray:
        """Fourier series features."""
        features = []
        for k in range(1, K + 1):
            features.append(np.sin(2 * np.pi * k * t / period))
            features.append(np.cos(2 * np.pi * k * t / period))
        return np.column_stack(features)

    def fit(self, dates: list[date], values: list[float]) -> None:
        """Model train qilish."""
        if len(dates) < 14:
            logger.warning(f'NeuralProphet: {len(dates)} snapshot — insufficient for training')
            return

        n = len(dates)
        t = np.arange(n, dtype=float)
        y = np.array(values, dtype=float)

        # Trend features
        trend_feat = np.column_stack([t, np.ones(n)])

        # Haftalik Fourier (period=7)
        weekly_feat = self._fourier_features(t, 7.0, K=3)

        # Yillik Fourier (period=365.25)
        day_of_year = np.array([(d - date(d.year, 1, 1)).days for d in dates], dtype=float)
        annual_feat = self._fourier_features(day_of_year, 365.25, K=5)

        # Voqea regressorlar
        regressors = _build_regressors(dates)
        event_feat = np.column_stack([regressors[e['name']] for e in UZBEK_SEASONAL_EVENTS]) \
            if UZBEK_SEASONAL_EVENTS else np.zeros((n, 1))

        # Barcha feature'lar birlashtiriladi
        X = np.hstack([trend_feat, weekly_feat, annual_feat, event_feat])

        # Least squares regression
        try:
            coefs, _, _, _ = np.linalg.lstsq(X, y, rcond=None)
            self._coefs = coefs
            self._n_features = X.shape[1]
            self._n_trend = 2
            self._n_weekly = weekly_feat.shape[1]
            self._n_annual = annual_feat.shape[1]

            # Trend koeffitsientlar
            self.trend_coef = float(coefs[0])
            self.trend_intercept = float(coefs[1])

            # Voqea koeffitsientlar
            offset = 2 + self._n_weekly + self._n_annual
            for i, event in enumerate(UZBEK_SEASONAL_EVENTS):
                self.event_coefs[event['name']] = float(coefs[offset + i]) if offset + i < len(coefs) else 0.0

            # Residual std
            y_pred = X @ coefs
            residuals = y - y_pred
            self.residual_std = float(np.std(residuals))
            self.last_trained = datetime.utcnow().isoformat()
            self.n_train = n

            logger.info(f'NeuralProphet fit: n={n}, trend={self.trend_coef:.4f}, residual_std={self.residual_std:.4f}')
        except np.linalg.LinAlgError as e:
            logger.error(f'NeuralProphet lstsq error: {e}')

    def predict(self, last_date: date, horizon: int) -> list[dict]:
        """horizon kun oldingga prognoz."""
        if not hasattr(self, '_coefs') or self._coefs is None:
            return []

        results = []
        n_base = self.n_train

        for h in range(1, horizon + 1):
            future_date = last_date + timedelta(days=h)
            t = float(n_base + h)

            # Trend
            trend_f = np.array([t, 1.0])

            # Haftalik
            weekly_f = self._fourier_features(np.array([t]), 7.0, K=3)[0]

            # Yillik
            doy = float((future_date - date(future_date.year, 1, 1)).days)
            annual_f = self._fourier_features(np.array([doy]), 365.25, K=5)[0]

            # Voqealar
            event_f = np.array([_is_event_day(future_date, e) for e in UZBEK_SEASONAL_EVENTS]) \
                if UZBEK_SEASONAL_EVENTS else np.array([0.0])

            x = np.concatenate([trend_f, weekly_f, annual_f, event_f])

            # Prediction
            n_expected = len(self._coefs)
            if len(x) != n_expected:
                x = np.pad(x, (0, max(0, n_expected - len(x))))[:n_expected]

            y_pred = float(np.dot(x, self._coefs))
            y_pred = max(0.0, y_pred)  # Manfiy bo'lmasin

            results.append({
                'date': future_date.isoformat(),
                'predicted_weekly_sold': round(y_pred, 2),
                'lower': round(max(0.0, y_pred - 1.5 * self.residual_std), 2),
                'upper': round(y_pred + 1.5 * self.residual_std, 2),
            })

        return results


def train_category(category_id: int, snapshots: list[dict]) -> dict:
    """
    Kategoriya uchun NeuralProphet model train qilish.

    snapshots: [{'snapshot_at': 'ISO str', 'avg_weekly_sold': float}, ...]
    """
    if len(snapshots) < 14:
        return {'error': f'Insufficient snapshots: {len(snapshots)} (min 14)'}

    dates = []
    values = []
    for s in sorted(snapshots, key=lambda x: x.get('snapshot_at', '')):
        try:
            dt = datetime.fromisoformat(s['snapshot_at'].replace('Z', '+00:00')).date()
            val = float(s.get('avg_weekly_sold', 0))
            dates.append(dt)
            values.append(val)
        except (KeyError, ValueError):
            continue

    if len(dates) < 14:
        return {'error': 'Failed to parse snapshots'}

    model = SimpleProphet()
    model.fit(dates, values)

    if model.trend_coef is None:
        return {'error': 'Training failed'}

    # Model ni saqlash
    path = _model_path(category_id)
    with open(path, 'wb') as f:
        pickle.dump(model, f)

    return {
        'status': 'trained',
        'category_id': category_id,
        'n_samples': len(dates),
        'trend_coef': model.trend_coef,
        'residual_std': model.residual_std,
    }


def predict_category(category_id: int, horizon: int = 7, snapshots: Optional[list[dict]] = None) -> dict:
    """
    Kategoriya uchun mavsumiy prognoz.

    Avval saqlangan model ishlatiladi. Model yo'q bo'lsa — snapshots dan train qilinadi.
    """
    path = _model_path(category_id)
    model: Optional[SimpleProphet] = None

    # Saqlangan modelni yuklash
    if os.path.exists(path):
        try:
            with open(path, 'rb') as f:
                model = pickle.load(f)
        except Exception as e:
            logger.warning(f'Failed to load model for category {category_id}: {e}')
            model = None

    # Agar model yo'q bo'lsa va snapshots berilgan bo'lsa — train qilish
    if model is None and snapshots:
        result = train_category(category_id, snapshots)
        if 'error' in result:
            return result
        if os.path.exists(path):
            with open(path, 'rb') as f:
                model = pickle.load(f)

    if model is None or not hasattr(model, '_coefs'):
        return {'error': f'No trained model for category {category_id}'}

    # Oxirgi snapshot sanasini topish
    last_date = date.today()
    if snapshots:
        try:
            last_date = max(
                datetime.fromisoformat(s['snapshot_at'].replace('Z', '+00:00')).date()
                for s in snapshots if s.get('snapshot_at')
            )
        except (ValueError, TypeError):
            pass

    predictions = model.predict(last_date, horizon)

    return {
        'category_id': category_id,
        'horizon': horizon,
        'model_name': 'neuralprophet_category',
        'last_trained': model.last_trained,
        'n_train': model.n_train,
        'trend_per_day': model.trend_coef,
        'predictions': predictions,
    }
