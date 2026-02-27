import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';

import {
  RoleBadge, StatusBadge,
  CreateAccountModal, DepositModal, ChangePasswordModal, AccountDrawer, WhitelabelTab,
} from '../components/admin/AdminComponents';
import { AdminDashboardTab } from '../components/admin/AdminDashboardTab';
import { AdminAccountsTab } from '../components/admin/AdminAccountsTab';
import { AdminAnalyticsTab } from '../components/admin/AdminAnalyticsTab';
import { AdminSystemTab } from '../components/admin/AdminSystemTab';
import { AdminFeedbackTab } from '../components/admin/AdminFeedbackTab';
import { AdminNotificationsTab } from '../components/admin/AdminNotificationsTab';
import { AdminAuditTab, AdminPermissionsTab, AdminDepositsTab } from '../components/admin/AdminAuditTab';

import type {
  Account, User, Role, AuditEvent,
  OverviewStats, RevenueStats, GrowthStats, RealtimeStats,
  TopUser, PopularProduct, PopularCategory,
  SystemHealth, AiUsage, SystemErrors,
  SearchResults, DepositEntry,
  CategoryTrend, HeatmapEntry,
  Tab,
} from '../components/admin/adminTypes';
import { VALID_TABS } from '../components/admin/adminTypes';

// ─── Main page ────────────────────────────────────────────────────────────────

const TAB_TITLES: Record<Tab, { title: string; desc: string }> = {
  dashboard: { title: 'Dashboard', desc: 'Umumiy statistika va real-time ko\'rsatkichlar' },
  accounts: { title: 'Akkauntlar', desc: 'Akkauntlar, userlar va to\'lov holati' },
  analytics: { title: 'Analitika & Mashhur', desc: 'Top mahsulotlar, kategoriyalar va foydalanuvchilar' },
  system: { title: 'Tizim', desc: 'API, Database, AI xarajatlari, xatolar' },
  feedback: { title: 'Feedback Boshqaruv', desc: 'Foydalanuvchi murojatlari' },
  notifications: { title: 'Xabarnomalar', desc: 'Shablon yoki custom xabar yuborish' },
  audit: { title: 'Audit Log', desc: 'Admin amallar + foydalanuvchi faoliyati tarixi' },
  permissions: { title: 'Ruxsatlar', desc: 'Rol va huquqlar tizimi' },
  deposits: { title: 'Deposit Log', desc: 'Balans to\'ldirish tarixi' },
  whitelabel: { title: 'White-label', desc: 'Branding, logo, ranglar va custom domain' },
};

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as Tab | null;
  const initialTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'dashboard';

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFeeInput, setGlobalFeeInput] = useState('');
  const [savingGlobalFee, setSavingGlobalFee] = useState(false);

  // Dashboard / Analytics stats
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueStats | null>(null);
  const [growth, setGrowth] = useState<GrowthStats | null>(null);
  const [realtime, setRealtime] = useState<RealtimeStats | null>(null);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);
  const [popularCategories, setPopularCategories] = useState<PopularCategory[]>([]);
  const [categoryTrends, setCategoryTrends] = useState<CategoryTrend[]>([]);
  const [productHeatmap, setProductHeatmap] = useState<HeatmapEntry[]>([]);

  // System stats
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsage | null>(null);
  const [systemErrors, setSystemErrors] = useState<SystemErrors | null>(null);
  const [errorsPage, setErrorsPage] = useState(1);

  // Deposits log
  const [depositLog, setDepositLog] = useState<DepositEntry[]>([]);
  const [depositLogTotal, setDepositLogTotal] = useState(0);
  const [depositLogPage, setDepositLogPage] = useState(1);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);

  // Modals
  const [depositTarget, setDepositTarget] = useState<Account | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [drawerAccount, setDrawerAccount] = useState<Account | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<{ id: string; email: string } | null>(null);

  // Sync tab state from URL
  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null;
    if ((t as string) === 'users') { setSearchParams({ tab: 'accounts' }); return; }
    if ((t as string) === 'popular') { setSearchParams({ tab: 'analytics' }); return; }
    const resolved = t && VALID_TABS.includes(t) ? t : 'dashboard';
    if (resolved !== activeTab) setActiveTab(resolved);
  }, [searchParams]);

  async function load() {
    setLoading(true);
    const [accRes, feeRes, auditRes, usersRes] = await Promise.all([
      adminApi.listAccounts().catch(() => null),
      adminApi.getGlobalFee().catch(() => null),
      adminApi.getAuditLog(50).catch(() => null),
      adminApi.listUsers().catch(() => null),
    ]);
    if (accRes) setAccounts(accRes.data);
    if (feeRes) setGlobalFeeInput(feeRes.data.daily_fee_default);
    if (auditRes) setAuditLog(auditRes.data);
    if (usersRes) setUsers(usersRes.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Load tab-specific data
  useEffect(() => {
    if (activeTab === 'dashboard') {
      adminApi.getStatsOverview().then((r) => setOverview(r.data)).catch(() => {});
      adminApi.getStatsRevenue().then((r) => setRevenue(r.data)).catch(() => {});
      adminApi.getStatsGrowth().then((r) => setGrowth(r.data)).catch(() => {});
      adminApi.getRealtimeStats().then((r) => setRealtime(r.data)).catch(() => {});
    } else if (activeTab === 'analytics') {
      adminApi.getPopularProducts().then((r) => setPopularProducts(r.data || [])).catch(() => {});
      adminApi.getPopularCategories().then((r) => setPopularCategories(r.data || [])).catch(() => {});
      adminApi.getTopUsers().then((r) => setTopUsers(r.data || [])).catch(() => {});
      adminApi.getStatsRevenue(30).then((r) => setRevenue(r.data)).catch(() => {});
      adminApi.getStatsGrowth(30).then((r) => setGrowth(r.data)).catch(() => {});
      adminApi.getCategoryTrends(8).then((r) => setCategoryTrends(r.data || [])).catch(() => {});
      adminApi.getProductHeatmap('30d').then((r) => setProductHeatmap(r.data || [])).catch(() => {});
    } else if (activeTab === 'system') {
      adminApi.getSystemHealth().then((r) => setHealth(r.data)).catch(() => {});
      adminApi.getAiUsageStats().then((r) => setAiUsage(r.data)).catch(() => {});
      adminApi.getSystemErrors({ page: 1, limit: 50, period: 7 }).then((r) => setSystemErrors(r.data)).catch(() => {});
    } else if (activeTab === 'deposits') {
      adminApi.getDepositLog(depositLogPage).then((r) => {
        setDepositLog(Array.isArray(r.data?.items) ? r.data.items : []);
        setDepositLogTotal(r.data?.total ?? 0);
      }).catch(() => {});
    }
  }, [activeTab, depositLogPage]);

  // ─── API Callbacks ────────────────────────────────────────────────────────

  async function saveGlobalFee() {
    const fee = parseInt(globalFeeInput);
    if (!fee || fee <= 0) return;
    setSavingGlobalFee(true);
    try { await adminApi.setGlobalFee(fee); toast.success(`Global kunlik to'lov ${fee.toLocaleString()} so'm`); }
    catch (err: unknown) { toast.error(getErrorMessage(err, 'Global to\'lovni o\'zgartirib bo\'lmadi')); }
    finally { setSavingGlobalFee(false); }
  }

  async function saveFee(accountId: string, fee: number | null) {
    try {
      await adminApi.setFee(accountId, fee);
      setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, daily_fee: fee?.toString() ?? null } : a));
      toast.success(fee ? `Kunlik to'lov ${fee.toLocaleString()} so'm qilindi` : 'Global kunlik to\'lovga qaytarildi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Kunlik to\'lovni o\'zgartirib bo\'lmadi')); throw err; }
  }

  async function savePhone(accountId: string, phone: string | null) {
    try {
      await adminApi.updateAccountPhone(accountId, phone);
      setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, phone } : a));
      toast.success(phone ? `Telefon raqam saqlandi: ${phone}` : 'Telefon raqam o\'chirildi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Telefon raqamni saqlab bo\'lmadi')); throw err; }
  }

  async function handleRoleChange(userId: string, newRole: Role) {
    try {
      await adminApi.updateRole(userId, newRole);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(`Rol o'zgartirildi`);
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Rolni o\'zgartirib bo\'lmadi')); }
  }

  async function handleToggleActive(userId: string) {
    try {
      const res = await adminApi.toggleActive(userId);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: res.data.is_active } : u));
      toast.success(res.data.is_active ? 'Foydalanuvchi faollashtirildi' : 'Foydalanuvchi bloklandi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Holatni o\'zgartirib bo\'lmadi')); }
  }

  async function handleStatusChange(accountId: string, status: string) {
    try {
      await adminApi.updateAccountStatus(accountId, status);
      setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, status: status as Account['status'] } : a));
      const labels: Record<string, string> = { ACTIVE: 'faollashtirildi', SUSPENDED: 'bloklandi', PAYMENT_DUE: 'to\'lov kerak' };
      toast.success(`Account ${labels[status] ?? status}`);
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Statusni o\'zgartirib bo\'lmadi')); }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    try {
      const r = await adminApi.globalSearch(searchQuery); setSearchResults(r.data);
      const count = (r.data.users?.length || 0) + (r.data.accounts?.length || 0) + (r.data.products?.length || 0);
      if (count === 0) toast.info('Hech narsa topilmadi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Qidiruvda xatolik')); }
  }

  async function handleDeleteDeposit(id: string) {
    if (!confirm('Bu tranzaksiyani o\'chirmoqchimisiz?')) return;
    try {
      await adminApi.deleteDeposit(id);
      setDepositLog((prev) => prev.filter((d) => d.id !== id));
      setDepositLogTotal((prev) => prev - 1);
      toast.success('Deposit yozuvi o\'chirildi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'O\'chirib bo\'lmadi')); }
  }

  async function loadErrorsPage(page: number) {
    setErrorsPage(page);
    adminApi.getSystemErrors({ page, limit: 50, period: 7 }).then((r) => setSystemErrors(r.data)).catch(() => {});
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><span className="loading loading-ring loading-lg text-primary" /></div>;
  }

  const currentTab = TAB_TITLES[activeTab];

  return (
    <>
      <div className="space-y-5 w-full">
        {/* Header + Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{currentTab.title}</h1>
              <span className="badge badge-error badge-sm">Admin</span>
            </div>
            <p className="text-base-content/40 text-sm mt-0.5">{currentTab.desc}</p>
          </div>
          <div className="flex items-center gap-2">
            <input className="input input-bordered input-sm w-48" placeholder="Qidirish (Ctrl+K)..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
            <button onClick={handleSearch} className="btn btn-ghost btn-sm">Izlash</button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults && (
          <div className="card bg-base-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Qidiruv natijalari</h3>
              <button className="btn btn-ghost btn-xs" onClick={() => setSearchResults(null)}>X</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-base-content/50 mb-1">Userlar</p>
                {(searchResults.users || []).map((u) => (
                  <div key={u.id} className="py-1">{u.email} <RoleBadge role={u.role} /></div>
                ))}
                {!(searchResults.users?.length) && <p className="text-base-content/30 text-xs">Topilmadi</p>}
              </div>
              <div>
                <p className="text-xs text-base-content/50 mb-1">Accountlar</p>
                {(searchResults.accounts || []).map((a) => (
                  <div key={a.id} className="py-1">{a.name} <StatusBadge status={a.status} /></div>
                ))}
                {!(searchResults.accounts?.length) && <p className="text-base-content/30 text-xs">Topilmadi</p>}
              </div>
              <div>
                <p className="text-xs text-base-content/50 mb-1">Mahsulotlar</p>
                {(searchResults.products || []).map((p) => (
                  <div key={p.id} className="py-1 truncate">{p.title}</div>
                ))}
                {!(searchResults.products?.length) && <p className="text-base-content/30 text-xs">Topilmadi</p>}
              </div>
            </div>
          </div>
        )}

        {/* ─── Tab Content ─────────────────────────────────────────────────── */}

        {activeTab === 'dashboard' && (
          <AdminDashboardTab
            accounts={accounts} users={users}
            overview={overview} revenue={revenue} growth={growth} realtime={realtime}
          />
        )}

        {activeTab === 'accounts' && (
          <AdminAccountsTab
            accounts={accounts} users={users}
            globalFeeInput={globalFeeInput} setGlobalFeeInput={setGlobalFeeInput}
            savingGlobalFee={savingGlobalFee} onSaveGlobalFee={saveGlobalFee}
            onSaveFee={saveFee} onSavePhone={savePhone}
            onRoleChange={handleRoleChange} onToggleActive={handleToggleActive}
            onStatusChange={handleStatusChange}
            onDeposit={setDepositTarget} onOpenDrawer={setDrawerAccount}
            onSetPassword={setPasswordTarget} onCreateAccount={() => setShowCreateAccount(true)}
          />
        )}

        {activeTab === 'analytics' && (
          <AdminAnalyticsTab
            topUsers={topUsers} popularProducts={popularProducts} popularCategories={popularCategories}
            revenue={revenue} growth={growth} categoryTrends={categoryTrends} productHeatmap={productHeatmap}
          />
        )}

        {activeTab === 'system' && (
          <AdminSystemTab
            health={health} aiUsage={aiUsage} systemErrors={systemErrors}
            errorsPage={errorsPage} onLoadErrorsPage={loadErrorsPage}
          />
        )}

        {activeTab === 'feedback' && <AdminFeedbackTab />}

        {activeTab === 'notifications' && <AdminNotificationsTab accounts={accounts} />}

        {activeTab === 'audit' && <AdminAuditTab auditLog={auditLog} />}

        {activeTab === 'permissions' && <AdminPermissionsTab />}

        {activeTab === 'deposits' && (
          <AdminDepositsTab
            depositLog={depositLog} depositLogTotal={depositLogTotal}
            depositLogPage={depositLogPage} setDepositLogPage={setDepositLogPage}
            onDeleteDeposit={handleDeleteDeposit}
          />
        )}

        {activeTab === 'whitelabel' && <WhitelabelTab />}
      </div>

      {/* Modals */}
      {showCreateAccount && <CreateAccountModal onClose={() => setShowCreateAccount(false)} onDone={load} />}
      {depositTarget && <DepositModal account={depositTarget} onClose={() => setDepositTarget(null)} onDone={load} />}
      {passwordTarget && <ChangePasswordModal user={passwordTarget} onClose={() => setPasswordTarget(null)} />}

      {drawerAccount && (
        <AccountDrawer
          account={drawerAccount} users={users}
          onClose={() => setDrawerAccount(null)} onRefresh={load}
        />
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right { animation: slideInRight 0.25s ease-out; }
      `}</style>
    </>
  );
}
