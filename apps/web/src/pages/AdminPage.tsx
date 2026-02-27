import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import { logError } from '../utils/handleError';
import {
  type Tab, type Account, type User, type AuditEvent, type Role,
  VALID_TABS, TAB_TITLES, ROLE_META,
  RoleBadge, StatusBadge,
  CreateAccountModal, DepositModal, ChangePasswordModal, AccountDrawer,
  DashboardTab, AccountsTab, AnalyticsTab, SystemTab,
  FeedbackTab, NotificationsTab, AuditLogTab, PermissionsTab,
  DepositsTab, WhitelabelTab,
} from '../components/admin';

// ─── Main page ──────────────────────────────────────────────────────────────

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as Tab | null;
  const initialTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'dashboard';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTabState] = useState<Tab>(initialTab);

  function setActiveTab(tab: Tab) {
    setActiveTabState(tab);
    setSearchParams(tab === 'dashboard' ? {} : { tab });
  }
  void setActiveTab;

  // Sync tab when URL changes
  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null;
    if (t === 'users' as unknown as Tab) { setSearchParams({ tab: 'accounts' }); return; }
    if (t === 'popular' as unknown as Tab) { setSearchParams({ tab: 'analytics' }); return; }
    const resolved = t && VALID_TABS.includes(t) ? t : 'dashboard';
    if (resolved !== activeTab) setActiveTabState(resolved);
  }, [searchParams]);

  // Stats
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [revenue, setRevenue] = useState<Record<string, unknown> | null>(null);
  const [growth, setGrowth] = useState<Record<string, unknown> | null>(null);
  const [popularProducts, setPopularProducts] = useState<Record<string, unknown>[]>([]);
  const [popularCategories, setPopularCategories] = useState<Record<string, unknown>[]>([]);
  const [realtime, setRealtime] = useState<Record<string, unknown> | null>(null);
  const [topUsers, setTopUsers] = useState<Record<string, unknown>[]>([]);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [feedbackTickets, setFeedbackTickets] = useState<Record<string, unknown>[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<Record<string, unknown> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Record<string, unknown> | null>(null);
  const [depositLog, setDepositLog] = useState<Record<string, unknown>[]>([]);
  const [depositLogTotal, setDepositLogTotal] = useState(0);
  const [depositLogPage, setDepositLogPage] = useState(1);

  // Modals
  const [depositTarget, setDepositTarget] = useState<Account | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [editingFee, setEditingFee] = useState<string | null>(null);
  const [feeInput, setFeeInput] = useState('');
  const [globalFeeInput, setGlobalFeeInput] = useState('');
  const [savingGlobalFee, setSavingGlobalFee] = useState(false);
  const [drawerAccount, setDrawerAccount] = useState<Account | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<{ id: string; email: string } | null>(null);

  // Notifications
  const [notifMsg, setNotifMsg] = useState('');
  const [notifType, setNotifType] = useState('info');
  const [notifSending, setNotifSending] = useState(false);
  const [notifTarget, setNotifTarget] = useState<'all' | 'selected'>('all');
  const [notifSelectedAccounts, setNotifSelectedAccounts] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Record<string, unknown>[]>([]);
  const [newTmplName, setNewTmplName] = useState('');
  const [newTmplMsg, setNewTmplMsg] = useState('');
  const [newTmplType, setNewTmplType] = useState('info');

  // Phone editing
  const [editingPhone, setEditingPhone] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState('');

  // AI Usage + System Errors (System tab v6)
  const [aiUsage, setAiUsage] = useState<Record<string, unknown> | null>(null);
  const [systemErrors, setSystemErrors] = useState<Record<string, unknown> | null>(null);
  const [errorsPage, setErrorsPage] = useState(1);

  // Analytics charts data
  const [categoryTrends, setCategoryTrends] = useState<Record<string, unknown>[]>([]);
  const [productHeatmap, setProductHeatmap] = useState<Record<string, unknown>[]>([]);

  async function load() {
    setLoading(true);
    const [accRes, feeRes, auditRes, usersRes] = await Promise.all([
      adminApi.listAccounts().catch((e) => { logError(e); return null; }),
      adminApi.getGlobalFee().catch((e) => { logError(e); return null; }),
      adminApi.getAuditLog(50).catch((e) => { logError(e); return null; }),
      adminApi.listUsers().catch((e) => { logError(e); return null; }),
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
      adminApi.getStatsOverview().then((r) => setOverview(r.data)).catch(logError);
      adminApi.getStatsRevenue().then((r) => setRevenue(r.data)).catch(logError);
      adminApi.getStatsGrowth().then((r) => setGrowth(r.data)).catch(logError);
      adminApi.getRealtimeStats().then((r) => setRealtime(r.data)).catch(logError);
    } else if (activeTab === 'analytics') {
      adminApi.getPopularProducts().then((r) => setPopularProducts(r.data || [])).catch(logError);
      adminApi.getPopularCategories().then((r) => setPopularCategories(r.data || [])).catch(logError);
      adminApi.getTopUsers().then((r) => setTopUsers(r.data || [])).catch(logError);
      adminApi.getStatsRevenue(30).then((r) => setRevenue(r.data)).catch(logError);
      adminApi.getStatsGrowth(30).then((r) => setGrowth(r.data)).catch(logError);
      adminApi.getCategoryTrends(8).then((r) => setCategoryTrends(r.data || [])).catch(logError);
      adminApi.getProductHeatmap('30d').then((r) => setProductHeatmap(r.data || [])).catch(logError);
    } else if (activeTab === 'system') {
      adminApi.getSystemHealth().then((r) => setHealth(r.data)).catch(logError);
      adminApi.getAiUsageStats().then((r) => setAiUsage(r.data)).catch(logError);
      adminApi.getSystemErrors({ page: 1, limit: 50, period: 7 }).then((r) => setSystemErrors(r.data)).catch(logError);
    } else if (activeTab === 'notifications') {
      adminApi.listNotificationTemplates().then((r) => setTemplates(Array.isArray(r.data) ? r.data : [])).catch(logError);
    } else if (activeTab === 'feedback') {
      adminApi.getAdminFeedback().then((r) => {
        const items = r.data?.items ?? r.data;
        setFeedbackTickets(Array.isArray(items) ? items : []);
      }).catch(logError);
      adminApi.getFeedbackStats().then((r) => setFeedbackStats(r.data)).catch(logError);
    } else if (activeTab === 'deposits') {
      adminApi.getDepositLog(depositLogPage).then((r) => {
        setDepositLog(Array.isArray(r.data?.items) ? r.data.items : []);
        setDepositLogTotal(r.data?.total ?? 0);
      }).catch(logError);
    }
  }, [activeTab]);

  async function saveFee(accountId: string) {
    const val = feeInput.trim();
    const fee = val === '' ? null : parseInt(val);
    try {
      await adminApi.setFee(accountId, fee); setEditingFee(null);
      setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, daily_fee: fee?.toString() ?? null } : a));
      toast.success(fee ? `Kunlik to'lov ${fee.toLocaleString()} so'm qilindi` : 'Global kunlik to\'lovga qaytarildi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Kunlik to\'lovni o\'zgartirib bo\'lmadi')); }
  }

  async function saveGlobalFee() {
    const fee = parseInt(globalFeeInput);
    if (!fee || fee <= 0) return;
    setSavingGlobalFee(true);
    try { await adminApi.setGlobalFee(fee); toast.success(`Global kunlik to'lov ${fee.toLocaleString()} so'm`); }
    catch (err: unknown) { toast.error(getErrorMessage(err, 'Global to\'lovni o\'zgartirib bo\'lmadi')); }
    finally { setSavingGlobalFee(false); }
  }

  async function handleRoleChange(userId: string, newRole: Role) {
    try {
      await adminApi.updateRole(userId, newRole);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(`Rol ${ROLE_META[newRole].label} ga o'zgartirildi`);
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
      const data = r.data as Record<string, unknown>;
      const count = ((data.users as unknown[])?.length || 0) + ((data.accounts as unknown[])?.length || 0) + ((data.products as unknown[])?.length || 0);
      if (count === 0) toast.info('Hech narsa topilmadi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Qidiruvda xatolik')); }
  }

  async function sendNotification() {
    if (!notifMsg.trim()) return;
    setNotifSending(true);
    try {
      const target = notifTarget === 'all' ? 'all' as const : notifSelectedAccounts;
      if (notifTarget === 'selected' && notifSelectedAccounts.length === 0) {
        toast.error('Kamida bitta account tanlang'); setNotifSending(false); return;
      }
      await adminApi.sendNotificationAdvanced({ message: notifMsg, type: notifType, target });
      setNotifMsg(''); setNotifSelectedAccounts([]);
      toast.success('Xabar yuborildi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Xabar yuborib bo\'lmadi')); }
    setNotifSending(false);
  }

  async function savePhone(accountId: string) {
    const val = phoneInput.trim() || null;
    try {
      await adminApi.updateAccountPhone(accountId, val);
      setEditingPhone(null);
      setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, phone: val } : a));
      toast.success(val ? `Telefon raqam saqlandi: ${val}` : 'Telefon raqam o\'chirildi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Telefon raqamni saqlab bo\'lmadi')); }
  }

  async function createTemplate() {
    if (!newTmplName.trim() || !newTmplMsg.trim()) return;
    try {
      const r = await adminApi.createNotificationTemplate({ name: newTmplName, message: newTmplMsg, type: newTmplType });
      setTemplates((prev) => [r.data, ...prev]);
      setNewTmplName(''); setNewTmplMsg(''); setNewTmplType('info');
      toast.success('Shablon yaratildi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Shablon yaratib bo\'lmadi')); }
  }

  async function deleteTemplate(id: string) {
    try {
      await adminApi.deleteNotificationTemplate(id);
      setTemplates((prev) => prev.filter((t) => (t.id as string) !== id));
      toast.success('Shablon o\'chirildi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Shablonni o\'chirib bo\'lmadi')); }
  }

  async function loadErrorsPage(page: number) {
    setErrorsPage(page);
    adminApi.getSystemErrors({ page, limit: 50, period: 7 }).then((r) => setSystemErrors(r.data)).catch(logError);
  }

  async function handleDeleteDeposit(id: string) {
    if (!confirm('Bu tranzaksiyani o\'chirmoqchimisiz?')) return;
    try {
      await adminApi.deleteDeposit(id);
      setDepositLog((prev) => prev.filter((d) => (d.id as string) !== id));
      setDepositLogTotal((prev) => prev - 1);
      toast.success('Deposit yozuvi o\'chirildi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'O\'chirib bo\'lmadi')); }
  }

  async function handleFeedbackStatus(ticketId: string, status: string) {
    try {
      await adminApi.updateFeedbackStatus(ticketId, status);
      setFeedbackTickets((prev) => prev.map((t) => (t.id as string) === ticketId ? { ...t, status } : t));
      toast.success(`Feedback statusi ${status} ga o'zgartirildi`);
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Statusni o\'zgartirib bo\'lmadi')); }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><span className="loading loading-ring loading-lg text-primary" /></div>;
  }

  const activeAccounts = accounts.filter((a) => a.status === 'ACTIVE').length;
  const dueAccounts = accounts.filter((a) => a.status === 'PAYMENT_DUE').length;
  const suspendedAccounts = accounts.filter((a) => a.status === 'SUSPENDED').length;
  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const activeUsers = users.filter((u) => u.is_active).length;

  const currentTab = {
    ...TAB_TITLES[activeTab],
    desc: activeTab === 'accounts'
      ? `${accounts.length} akkaunt, ${users.length} user, ${activeUsers} faol`
      : TAB_TITLES[activeTab].desc,
  };

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
                {((searchResults.users as Record<string, unknown>[]) || []).map((u) => (
                  <div key={u.id as string} className="py-1">{u.email as string} <RoleBadge role={u.role as Role} /></div>
                ))}
                {!((searchResults.users as unknown[])?.length) && <p className="text-base-content/30 text-xs">Topilmadi</p>}
              </div>
              <div>
                <p className="text-xs text-base-content/50 mb-1">Accountlar</p>
                {((searchResults.accounts as Record<string, unknown>[]) || []).map((a) => (
                  <div key={a.id as string} className="py-1">{a.name as string} <StatusBadge status={a.status as Account['status']} /></div>
                ))}
                {!((searchResults.accounts as unknown[])?.length) && <p className="text-base-content/30 text-xs">Topilmadi</p>}
              </div>
              <div>
                <p className="text-xs text-base-content/50 mb-1">Mahsulotlar</p>
                {((searchResults.products as Record<string, unknown>[]) || []).map((p) => (
                  <div key={p.id as string} className="py-1 truncate">{p.title as string}</div>
                ))}
                {!((searchResults.products as unknown[])?.length) && <p className="text-base-content/30 text-xs">Topilmadi</p>}
              </div>
            </div>
          </div>
        )}

        {/* Tab content */}
        {activeTab === 'dashboard' && (
          <DashboardTab
            accounts={accounts} activeAccounts={activeAccounts} dueAccounts={dueAccounts}
            users={users} activeUsers={activeUsers} totalBalance={totalBalance}
            overview={overview} revenue={revenue} growth={growth} realtime={realtime}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsTab
            accounts={accounts} users={users}
            activeAccounts={activeAccounts} dueAccounts={dueAccounts}
            suspendedAccounts={suspendedAccounts} totalBalance={totalBalance}
            globalFeeInput={globalFeeInput} savingGlobalFee={savingGlobalFee}
            onGlobalFeeChange={setGlobalFeeInput} onSaveGlobalFee={saveGlobalFee}
            onShowCreateAccount={() => setShowCreateAccount(true)}
            onDepositTarget={setDepositTarget} onDrawerAccount={setDrawerAccount}
            onStatusChange={handleStatusChange} onRoleChange={handleRoleChange}
            onToggleActive={handleToggleActive}
            onPasswordTarget={setPasswordTarget}
            onSaveFee={saveFee} editingFee={editingFee} feeInput={feeInput}
            onEditingFeeChange={setEditingFee} onFeeInputChange={setFeeInput}
            editingPhone={editingPhone} phoneInput={phoneInput}
            onEditingPhoneChange={setEditingPhone} onPhoneInputChange={setPhoneInput}
            onSavePhone={savePhone}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab
            topUsers={topUsers} popularProducts={popularProducts}
            popularCategories={popularCategories}
            revenue={revenue} growth={growth}
            categoryTrends={categoryTrends} productHeatmap={productHeatmap}
          />
        )}

        {activeTab === 'system' && (
          <SystemTab
            health={health} aiUsage={aiUsage}
            systemErrors={systemErrors} errorsPage={errorsPage}
            onLoadErrorsPage={loadErrorsPage}
          />
        )}

        {activeTab === 'feedback' && (
          <FeedbackTab
            feedbackStats={feedbackStats}
            feedbackTickets={feedbackTickets}
            onFeedbackStatus={handleFeedbackStatus}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsTab
            accounts={accounts}
            notifMsg={notifMsg} notifType={notifType} notifSending={notifSending}
            notifTarget={notifTarget} notifSelectedAccounts={notifSelectedAccounts}
            templates={templates}
            newTmplName={newTmplName} newTmplMsg={newTmplMsg} newTmplType={newTmplType}
            onNotifMsgChange={setNotifMsg} onNotifTypeChange={setNotifType}
            onNotifTargetChange={setNotifTarget} onNotifSelectedAccountsChange={setNotifSelectedAccounts}
            onSendNotification={sendNotification}
            onNewTmplNameChange={setNewTmplName} onNewTmplMsgChange={setNewTmplMsg}
            onNewTmplTypeChange={setNewTmplType}
            onCreateTemplate={createTemplate} onDeleteTemplate={deleteTemplate}
            onUseTemplate={(message, type) => { setNotifMsg(message); setNotifType(type); }}
          />
        )}

        {activeTab === 'audit' && <AuditLogTab auditLog={auditLog} />}

        {activeTab === 'permissions' && <PermissionsTab />}

        {activeTab === 'deposits' && (
          <DepositsTab
            depositLog={depositLog} depositLogTotal={depositLogTotal}
            depositLogPage={depositLogPage}
            onDepositLogPageChange={setDepositLogPage}
            onDeleteDeposit={handleDeleteDeposit}
          />
        )}
      </div>

      {/* White-label tab — rendered outside the space-y-5 wrapper (matches original) */}
      {activeTab === 'whitelabel' && <WhitelabelTab />}

      {/* Modals */}
      {showCreateAccount && <CreateAccountModal onClose={() => setShowCreateAccount(false)} onDone={load} />}
      {depositTarget && <DepositModal account={depositTarget} onClose={() => setDepositTarget(null)} onDone={load} />}
      {passwordTarget && <ChangePasswordModal user={passwordTarget} onClose={() => setPasswordTarget(null)} />}

      {/* Account Detail Drawer */}
      {drawerAccount && (
        <AccountDrawer
          account={drawerAccount}
          users={users}
          onClose={() => setDrawerAccount(null)}
          onRefresh={load}
        />
      )}

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.25s ease-out;
        }
      `}</style>
    </>
  );
}
