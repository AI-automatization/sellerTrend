// ─── WhitelabelTab ───────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

export function WhitelabelTab() {
  const [config, setConfig] = useState({
    appName: 'VENTRA',
    logoText: 'V',
    logoSubtitle: 'Analytics Platform',
    primaryColor: '#4C7DFF',
    supportEmail: 'support@ventra.uz',
    marketplaceName: 'Uzum',
    marketplaceUrl: 'https://uzum.uz',
    customDomain: '',
  });
  const [saving, setSaving] = useState(false);

  function handleSave() {
    setSaving(true);
    try {
      localStorage.setItem('whitelabel_config', JSON.stringify(config));
      toast.success('Branding sozlamalari saqlandi');
    } catch {
      toast.error('Saqlashda xato');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem('whitelabel_config');
      if (saved) setConfig(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6">
        <h3 className="font-bold text-sm mb-4">Ko'rinish</h3>
        <div className="flex items-center gap-4 bg-base-300/60 rounded-xl p-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl text-white"
            style={{ backgroundColor: config.primaryColor }}>
            {config.logoText}
          </div>
          <div>
            <p className="font-bold text-lg">{config.appName}</p>
            <p className="text-xs text-base-content/50">{config.logoSubtitle}</p>
          </div>
        </div>
      </div>

      {/* App Identity */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-4">
        <h3 className="font-bold text-sm">Platforma identifikatsiyasi</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="form-control">
            <div className="label"><span className="label-text text-xs">Platforma nomi</span></div>
            <input className="input input-bordered input-sm" value={config.appName}
              onChange={(e) => setConfig({ ...config, appName: e.target.value })} />
          </label>
          <label className="form-control">
            <div className="label"><span className="label-text text-xs">Logo harfi</span></div>
            <input className="input input-bordered input-sm w-20" maxLength={2} value={config.logoText}
              onChange={(e) => setConfig({ ...config, logoText: e.target.value })} />
          </label>
          <label className="form-control">
            <div className="label"><span className="label-text text-xs">Logo taglavha</span></div>
            <input className="input input-bordered input-sm" value={config.logoSubtitle}
              onChange={(e) => setConfig({ ...config, logoSubtitle: e.target.value })} />
          </label>
          <label className="form-control">
            <div className="label"><span className="label-text text-xs">Support email</span></div>
            <input className="input input-bordered input-sm" type="email" value={config.supportEmail}
              onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })} />
          </label>
        </div>
      </div>

      {/* Colors */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-4">
        <h3 className="font-bold text-sm">Ranglar</h3>
        <div className="flex items-center gap-4">
          <label className="form-control">
            <div className="label"><span className="label-text text-xs">Asosiy rang</span></div>
            <div className="flex items-center gap-2">
              <input type="color" className="w-10 h-10 rounded-lg border border-base-300 cursor-pointer"
                value={config.primaryColor}
                onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })} />
              <input className="input input-bordered input-sm w-28 font-mono" value={config.primaryColor}
                onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })} />
            </div>
          </label>
          <div className="flex gap-2 mt-6">
            {['#4C7DFF', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map((c) => (
              <button key={c} className="w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110"
                style={{ backgroundColor: c, borderColor: config.primaryColor === c ? '#fff' : 'transparent' }}
                onClick={() => setConfig({ ...config, primaryColor: c })} />
            ))}
          </div>
        </div>
      </div>

      {/* Marketplace */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-4">
        <h3 className="font-bold text-sm">Marketplace sozlamalari</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="form-control">
            <div className="label"><span className="label-text text-xs">Marketplace nomi</span></div>
            <input className="input input-bordered input-sm" value={config.marketplaceName}
              onChange={(e) => setConfig({ ...config, marketplaceName: e.target.value })} />
          </label>
          <label className="form-control">
            <div className="label"><span className="label-text text-xs">Marketplace URL</span></div>
            <input className="input input-bordered input-sm" value={config.marketplaceUrl}
              onChange={(e) => setConfig({ ...config, marketplaceUrl: e.target.value })} />
          </label>
          <label className="form-control sm:col-span-2">
            <div className="label"><span className="label-text text-xs">Custom domain (opsional)</span></div>
            <input className="input input-bordered input-sm" placeholder="analytics.yourdomain.com" value={config.customDomain}
              onChange={(e) => setConfig({ ...config, customDomain: e.target.value })} />
            <div className="label"><span className="label-text-alt text-xs text-base-content/40">CNAME rekordni sozlab, shu yerga domain kiriting</span></div>
          </label>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button className="btn btn-primary btn-sm gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <span className="loading loading-spinner loading-xs" /> : null}
          Saqlash
        </button>
      </div>
    </div>
  );
}
