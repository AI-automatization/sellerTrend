import { MAX_SCORE } from './types';

interface ScoreRadialProps {
  score: number;
}

export function ScoreRadial({ score }: ScoreRadialProps) {
  const pct = Math.min((score / MAX_SCORE) * 100, 100);
  const color = score >= 6 ? '#22c55e' : score >= 4 ? '#f59e0b' : '#6b7280';
  return (
    <div
      className="radial-progress text-2xl lg:text-3xl font-bold"
      style={{ '--value': pct, '--size': '8rem', '--thickness': '7px', color } as any}
      role="progressbar"
    >
      {score.toFixed(2)}
    </div>
  );
}
