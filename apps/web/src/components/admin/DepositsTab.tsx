// ─── DepositsTab ─────────────────────────────────────────────────────────────

export interface DepositsTabProps {
  depositLog: Record<string, unknown>[];
  depositLogTotal: number;
  depositLogPage: number;
  onDepositLogPageChange: (page: number) => void;
  onDeleteDeposit: (id: string) => void;
}

export function DepositsTab({ depositLog, depositLogTotal, depositLogPage, onDepositLogPageChange, onDeleteDeposit }: DepositsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-base-content/50">Jami: {depositLogTotal} ta deposit</p>
      </div>
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr><th>Sana</th><th>Kompaniya</th><th>Miqdor</th><th>Oldingi</th><th>Keyingi</th><th>Izoh</th><th>Amal</th></tr>
          </thead>
          <tbody>
            {depositLog.map((d) => (
              <tr key={d.id as string} className="hover">
                <td className="text-xs whitespace-nowrap">{new Date(d.created_at as string).toLocaleString()}</td>
                <td className="text-sm">{d.account_name as string}</td>
                <td className="text-success font-bold tabular-nums">+{Number(d.amount).toLocaleString()}</td>
                <td className="text-xs tabular-nums text-base-content/50">{Number(d.balance_before).toLocaleString()}</td>
                <td className="text-xs tabular-nums text-base-content/50">{Number(d.balance_after).toLocaleString()}</td>
                <td className="text-xs text-base-content/40 max-w-xs truncate">{(d.description as string) || '—'}</td>
                <td>
                  <button className="btn btn-ghost btn-xs text-error" onClick={() => onDeleteDeposit(d.id as string)}>
                    O'chirish
                  </button>
                </td>
              </tr>
            ))}
            {!depositLog.length && (
              <tr><td colSpan={7} className="text-center text-base-content/40 py-8">Deposit mavjud emas</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {depositLogTotal > 20 && (
        <div className="flex justify-center gap-2">
          <button className="btn btn-ghost btn-sm" disabled={depositLogPage <= 1}
            onClick={() => onDepositLogPageChange(depositLogPage - 1)}>Oldingi</button>
          <span className="btn btn-ghost btn-sm no-animation">{depositLogPage}</span>
          <button className="btn btn-ghost btn-sm" disabled={depositLog.length < 20}
            onClick={() => onDepositLogPageChange(depositLogPage + 1)}>Keyingi</button>
        </div>
      )}
    </div>
  );
}
