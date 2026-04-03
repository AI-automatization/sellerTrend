import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import { logError } from '../utils/handleError';
import {
  type Tab, type Account, type User, type AuditEvent, type Role,
  type TopUser, type PopularProduct, type PopularCategory,
  type RevenueStats, type GrowthStats, type CategoryTrend, type HeatmapEntry,
  type FeedbackTicket, type FeedbackStats, type SearchResults,
  type DepositEntry, type NotificationTemplate,
  type RealtimeStats, type SystemHealth, type AiUsage, type SystemErrors,
  type OverviewStats, type RagAuditStats, type MlAuditStats,
  VALID_TABS, TAB_TITLES, ROLE_META,
} from '../components/admin';

// ─── Hook Return Type ────────────────────────────────────────────────────────

export interface UseAdminDataReturn {
  // Core data
  accounts: Account[];
  users: User[];
  auditLog: AuditEvent[];
  loading: boolean;

  // Tab
  activeTab: Tab;
  currentTab: { title: string; desc: string };

  // Dashboard stats
  overview: OverviewStats | null;
  revenue: RevenueStats | null;
  growth: GrowthStats | null;
  realtime: RealtimeStats | null;

  // Analytics
  topUsers: TopUser[];
  popularProducts: PopularProduct[];
  popularCategories: PopularCategory[];
  categoryTrends: CategoryTrend[];
  productHeatmap: HeatmapEntry[];

  // System
  health: SystemHealth | null;
  aiUsage: AiUsage | null;
  systemErrors: SystemErrors | null;
  errorsPage: number;
  loadErrorsPage: (page: number) => void;

  // AI Audit
  ragAuditStats: RagAuditStats | null;
  ragAuditLoading: boolean;
  ragAuditPeriod: number;
  setRagAuditPeriod: (p: number) => void;

  // ML Audit
  mlAuditStats: MlAuditStats | null;
  mlAuditLoading: boolean;
  mlAuditPeriod: number;
  setMlAuditPeriod: (p: number) => void;

  // Feedback
  feedbackTickets: FeedbackTicket[];
  feedbackStats: FeedbackStats | null;
  handleFeedbackStatus: (ticketId: string, status: string) => Promise<void>;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: SearchResults | null;
  setSearchResults: (r: SearchResults | null) => void;
  handleSearch: () => Promise<void>;

  // Deposits
  depositLog: DepositEntry[];
  depositLogTotal: number;
  depositLogPage: number;
  setDepositLogPage: (page: number) => void;
  handleDeleteDeposit: (id: string) => Promise<void>;

  // Modals
  depositTarget: Account | null;
  setDepositTarget: (a: Account | null) => void;
  showCreateAccount: boolean;
  setShowCreateAccount: (v: boolean) => void;
  drawerAccount: Account | null;
  setDrawerAccount: (a: Account | null) => void;
  passwordTarget: { id: string; email: string } | null;
  setPasswordTarget: (t: { id: string; email: string } | null) => void;

  // Fee editing
  editingFee: string | null;
  setEditingFee: (id: string | null) => void;
  feeInput: string;
  setFeeInput: (v: string) => void;
  globalFeeInput: string;
  setGlobalFeeInput: (v: string) => void;
  savingGlobalFee: boolean;
  saveFee: (accountId: string) => Promise<void>;
  saveGlobalFee: () => Promise<void>;

  // Phone editing
  editingPhone: string | null;
  setEditingPhone: (id: string | null) => void;
  phoneInput: string;
  setPhoneInput: (v: string) => void;
  savePhone: (accountId: string) => Promise<void>;

  // User management
  handleRoleChange: (userId: string, newRole: Role) => Promise<void>;
  handleToggleActive: (userId: string) => Promise<void>;
  handleStatusChange: (accountId: string, status: string) => Promise<void>;

  // Notifications
  notifMsg: string;
  setNotifMsg: (v: string) => void;
  notifType: string;
  setNotifType: (v: string) => void;
  notifSending: boolean;
  notifTarget: 'all' | 'selected';
  setNotifTarget: (v: 'all' | 'selected') => void;
  notifSelectedAccounts: string[];
  setNotifSelectedAccounts: (v: string[]) => void;
  sendNotification: () => Promise<void>;

  // Templates
  templates: NotificationTemplate[];
  newTmplName: string;
  setNewTmplName: (v: string) => void;
  newTmplMsg: string;
  setNewTmplMsg: (v: string) => void;
  newTmplType: string;
  setNewTmplType: (v: string) => void;
  createTemplate: () => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  onUseTemplate: (message: string, type: string) => void;

  // Computed
  activeAccounts: number;
  suspendedAccounts: number;
  activeUsers: number;

  // Reload
  load: () => Promise<void>;
}

// ─── Timeout helper ──────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms),
    ),
  ]);
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAdminData(): UseAdminDataReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as Tab | null;
  const initialTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'dashboard';

  // Core data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTabState] = useState<Tab>(initialTab);

  // Dashboard stats
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueStats | null>(null);
  const [growth, setGrowth] = useState<GrowthStats | null>(null);
  const [realtime, setRealtime] = useState<RealtimeStats | null>(null);

  // Analytics
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);
  const [popularCategories, setPopularCategories] = useState<PopularCategory[]>([]);
  const [categoryTrends, setCategoryTrends] = useState<CategoryTrend[]>([]);
  const [productHeatmap, setProductHeatmap] = useState<HeatmapEntry[]>([]);

  // System
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsage | null>(null);
  const [systemErrors, setSystemErrors] = useState<SystemErrors | null>(null);
  const [errorsPage, setErrorsPage] = useState(1);

  // AI Audit
  const [ragAuditStats, setRagAuditStats] = useState<RagAuditStats | null>(null);
  const [ragAuditLoading, setRagAuditLoading] = useState(false);
  const [ragAuditPeriod, setRagAuditPeriodState] = useState(7);

  const setRagAuditPeriod = useCallback((p: number) => {
    setRagAuditPeriodState(p);
    setRagAuditLoading(true);
    adminApi.getRagAuditStats(p)
      .then((r) => setRagAuditStats(r.data))
      .catch(logError)
      .finally(() => setRagAuditLoading(false));
  }, []);

  // ML Audit
  const [mlAuditStats, setMlAuditStats] = useState<MlAuditStats | null>(null);
  const [mlAuditLoading, setMlAuditLoading] = useState(false);
  const [mlAuditPeriod, setMlAuditPeriodState] = useState(7);

  const setMlAuditPeriod = useCallback((p: number) => {
    setMlAuditPeriodState(p);
    setMlAuditLoading(true);
    adminApi.getMlAuditStats(p)
      .then((r) => setMlAuditStats(r.data))
      .catch(logError)
      .finally(() => setMlAuditLoading(false));
  }, []);

  // Feedback
  const [feedbackTickets, setFeedbackTickets] = useState<FeedbackTicket[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);

  // Deposits
  const [depositLog, setDepositLog] = useState<DepositEntry[]>([]);
  const [depositLogTotal, setDepositLogTotal] = useState(0);
  const [depositLogPage, setDepositLogPage] = useState(1);

  // Modals
  const [depositTarget, setDepositTarget] = useState<Account | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [drawerAccount, setDrawerAccount] = useState<Account | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<{ id: string; email: string } | null>(null);

  // Fee editing
  const [editingFee, setEditingFee] = useState<string | null>(null);
  const [feeInput, setFeeInput] = useState('');
  const [globalFeeInput, setGlobalFeeInput] = useState('');
  const [savingGlobalFee, setSavingGlobalFee] = useState(false);

  // Phone editing
  const [editingPhone, setEditingPhone] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState('');

  // Notifications
  const [notifMsg, setNotifMsg] = useState('');
  const [notifType, setNotifType] = useState('info');
  const [notifSending, setNotifSending] = useState(false);
  const [notifTarget, setNotifTarget] = useState<'all' | 'selected'>('all');
  const [notifSelectedAccounts, setNotifSelectedAccounts] = useState<string[]>([]);

  // Templates
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [newTmplName, setNewTmplName] = useState('');
  const [newTmplMsg, setNewTmplMsg] = useState('');
  const [newTmplType, setNewTmplType] = useState('info');

  // ─── Tab URL sync ──────────────────────────────────────────────────────────

  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null;
    if (t === ('users' as unknown as Tab)) { setSearchParams({ tab: 'accounts' }); return; }
    if (t === ('popular' as unknown as Tab)) { setSearchParams({ tab: 'analytics' }); return; }
    const resolved = t && VALID_TABS.includes(t) ? t : 'dashboard';
    if (resolved !== activeTab) setActiveTabState(resolved);
  }, [searchParams, activeTab, setSearchParams]);

  // ─── Load core data ────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    const [accRes, feeRes, auditRes, usersRes] = await Promise.all([
      withTimeout(adminApi.listAccounts()).catch((e) => { logError(e); return null; }),
      withTimeout(adminApi.getGlobalFee()).catch((e) => { logError(e); return null; }),
      withTimeout(adminApi.getAuditLog(50)).catch((e) => { logError(e); return null; }),
      withTimeout(adminApi.listUsers()).catch((e) => { logError(e); return null; }),
    ]);
    if (accRes) setAccounts(accRes.data?.items ?? accRes.data);
    if (feeRes) setGlobalFeeInput(feeRes.data.daily_fee_default);
    if (auditRes) setAuditLog(auditRes.data);
    if (usersRes) setUsers(usersRes.data?.items ?? usersRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Tab-specific data loading ─────────────────────────────────────────────

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
      adminApi.getSystemHealth().then((r) => setHealth(r.data))
        .then(() => adminApi.getAiUsageStats()).then((r) => setAiUsage(r.data))
        .then(() => adminApi.getSystemErrors({ page: 1, limit: 50, period: 7 })).then((r) => setSystemErrors(r.data))
        .catch(logError);
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
    } else if (activeTab === 'ai-audit') {
      setRagAuditLoading(true);
      adminApi.getRagAuditStats(ragAuditPeriod)
        .then((r) => setRagAuditStats(r.data))
        .catch(logError)
        .finally(() => setRagAuditLoading(false));
    } else if (activeTab === 'ml-audit') {
      setMlAuditLoading(true);
      adminApi.getMlAuditStats(mlAuditPeriod)
        .then((r) => setMlAuditStats(r.data))
        .catch(logError)
        .finally(() => setMlAuditLoading(false));
    }
  }, [activeTab, depositLogPage, ragAuditPeriod, mlAuditPeriod]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const saveFee = useCallback(async (accountId: string) => {
    const val = feeInput.trim();
    const fee = val === '' ? null : parseInt(val);
    try {
      await adminApi.setFee(accountId, fee);
      setEditingFee(null);
      setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, daily_fee: fee?.toString() ?? null } : a));
      toast.success(fee ? `Kunlik to'lov ${fee.toLocaleString()} so'm qilindi` : 'Global kunlik to\'lovga qaytarildi');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Kunlik to\'lovni o\'zgartirib bo\'lmadi'));
    }
  }, [feeInput]);

  const saveGlobalFee = useCallback(async () => {
    const fee = parseInt(globalFeeInput);
    if (!fee || fee <= 0) return;
    setSavingGlobalFee(true);
    try {
      await adminApi.setGlobalFee(fee);
      toast.success(`Global kunlik to'lov ${fee.toLocaleString()} so'm`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Global to\'lovni o\'zgartirib bo\'lmadi'));
    } finally {
      setSavingGlobalFee(false);
    }
  }, [globalFeeInput]);

  const handleRoleChange = useCallback(async (userId: string, newRole: Role) => {
    try {
      await adminApi.updateRole(userId, newRole);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(`Rol ${ROLE_META[newRole].label} ga o'zgartirildi`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Rolni o\'zgartirib bo\'lmadi'));
    }
  }, []);

  const handleToggleActive = useCallback(async (userId: string) => {
    try {
      const res = await adminApi.toggleActive(userId);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: res.data.is_active } : u));
      toast.success(res.data.is_active ? 'Foydalanuvchi faollashtirildi' : 'Foydalanuvchi bloklandi');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Holatni o\'zgartirib bo\'lmadi'));
    }
  }, []);

  const handleStatusChange = useCallback(async (accountId: string, status: string) => {
    try {
      await adminApi.updateAccountStatus(accountId, status);
      setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, status: status as Account['status'] } : a));
      const labels: Record<string, string> = { ACTIVE: 'faollashtirildi', SUSPENDED: 'bloklandi' };
      toast.success(`Account ${labels[status] ?? status}`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Statusni o\'zgartirib bo\'lmadi'));
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    try {
      const r = await adminApi.globalSearch(searchQuery);
      const data = r.data as SearchResults;
      setSearchResults(data);
      const count = (data.users?.length || 0) + (data.accounts?.length || 0) + (data.products?.length || 0);
      if (count === 0) toast.info('Hech narsa topilmadi');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Qidiruvda xatolik'));
    }
  }, [searchQuery]);

  const sendNotification = useCallback(async () => {
    if (!notifMsg.trim()) return;
    setNotifSending(true);
    try {
      const target = notifTarget === 'all' ? 'all' as const : notifSelectedAccounts;
      if (notifTarget === 'selected' && notifSelectedAccounts.length === 0) {
        toast.error('Kamida bitta account tanlang');
        setNotifSending(false);
        return;
      }
      await adminApi.sendNotificationAdvanced({ message: notifMsg, type: notifType, target });
      setNotifMsg('');
      setNotifSelectedAccounts([]);
      toast.success('Xabar yuborildi');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Xabar yuborib bo\'lmadi'));
    }
    setNotifSending(false);
  }, [notifMsg, notifType, notifTarget, notifSelectedAccounts]);

  const savePhone = useCallback(async (accountId: string) => {
    const val = phoneInput.trim() || null;
    try {
      await adminApi.updateAccountPhone(accountId, val);
      setEditingPhone(null);
      setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, phone: val } : a));
      toast.success(val ? `Telefon raqam saqlandi: ${val}` : 'Telefon raqam o\'chirildi');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Telefon raqamni saqlab bo\'lmadi'));
    }
  }, [phoneInput]);

  const createTemplate = useCallback(async () => {
    if (!newTmplName.trim() || !newTmplMsg.trim()) return;
    try {
      const r = await adminApi.createNotificationTemplate({ name: newTmplName, message: newTmplMsg, type: newTmplType });
      setTemplates((prev) => [r.data as NotificationTemplate, ...prev]);
      setNewTmplName('');
      setNewTmplMsg('');
      setNewTmplType('info');
      toast.success('Shablon yaratildi');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Shablon yaratib bo\'lmadi'));
    }
  }, [newTmplName, newTmplMsg, newTmplType]);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      await adminApi.deleteNotificationTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success('Shablon o\'chirildi');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Shablonni o\'chirib bo\'lmadi'));
    }
  }, []);

  const loadErrorsPage = useCallback((page: number) => {
    setErrorsPage(page);
    adminApi.getSystemErrors({ page, limit: 50, period: 7 }).then((r) => setSystemErrors(r.data)).catch(logError);
  }, []);

  const handleDeleteDeposit = useCallback(async (id: string) => {
    if (!confirm('Bu tranzaksiyani o\'chirmoqchimisiz?')) return;
    try {
      await adminApi.deleteDeposit(id);
      setDepositLog((prev) => prev.filter((d) => d.id !== id));
      setDepositLogTotal((prev) => prev - 1);
      toast.success('Deposit yozuvi o\'chirildi');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'O\'chirib bo\'lmadi'));
    }
  }, []);

  const handleFeedbackStatus = useCallback(async (ticketId: string, status: string) => {
    try {
      await adminApi.updateFeedbackStatus(ticketId, status);
      setFeedbackTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status } : t));
      toast.success(`Feedback statusi ${status} ga o'zgartirildi`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Statusni o\'zgartirib bo\'lmadi'));
    }
  }, []);

  const onUseTemplate = useCallback((message: string, type: string) => {
    setNotifMsg(message);
    setNotifType(type);
  }, []);

  // ─── Computed values ───────────────────────────────────────────────────────

  const activeAccounts = useMemo(() => accounts.filter((a) => a.status === 'ACTIVE').length, [accounts]);
  const suspendedAccounts = useMemo(() => accounts.filter((a) => a.status === 'SUSPENDED').length, [accounts]);
  const activeUsers = useMemo(() => users.filter((u) => u.is_active).length, [users]);

  const currentTab = useMemo(() => ({
    ...TAB_TITLES[activeTab],
    desc: activeTab === 'accounts'
      ? `${accounts.length} akkaunt, ${users.length} user, ${activeUsers} faol`
      : TAB_TITLES[activeTab].desc,
  }), [activeTab, accounts.length, users.length, activeUsers]);

  // ─── Return ────────────────────────────────────────────────────────────────

  return {
    accounts, users, auditLog, loading,
    activeTab, currentTab,
    overview, revenue, growth, realtime,
    topUsers, popularProducts, popularCategories, categoryTrends, productHeatmap,
    health, aiUsage, systemErrors, errorsPage, loadErrorsPage,
    ragAuditStats, ragAuditLoading, ragAuditPeriod, setRagAuditPeriod,
    mlAuditStats, mlAuditLoading, mlAuditPeriod, setMlAuditPeriod,
    feedbackTickets, feedbackStats, handleFeedbackStatus,
    searchQuery, setSearchQuery, searchResults, setSearchResults, handleSearch,
    depositLog, depositLogTotal, depositLogPage, setDepositLogPage, handleDeleteDeposit,
    depositTarget, setDepositTarget,
    showCreateAccount, setShowCreateAccount,
    drawerAccount, setDrawerAccount,
    passwordTarget, setPasswordTarget,
    editingFee, setEditingFee, feeInput, setFeeInput,
    globalFeeInput, setGlobalFeeInput, savingGlobalFee,
    saveFee, saveGlobalFee,
    editingPhone, setEditingPhone, phoneInput, setPhoneInput, savePhone,
    handleRoleChange, handleToggleActive, handleStatusChange,
    notifMsg, setNotifMsg, notifType, setNotifType, notifSending,
    notifTarget, setNotifTarget, notifSelectedAccounts, setNotifSelectedAccounts,
    sendNotification,
    templates, newTmplName, setNewTmplName, newTmplMsg, setNewTmplMsg,
    newTmplType, setNewTmplType, createTemplate, deleteTemplate, onUseTemplate,
    activeAccounts, suspendedAccounts, activeUsers,
    load,
  };
}
