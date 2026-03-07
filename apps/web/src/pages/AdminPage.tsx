import {
  type Role, type Account,
  RoleBadge, StatusBadge,
  CreateAccountModal, DepositModal, ChangePasswordModal, AccountDrawer,
  DashboardTab, AccountsTab, AnalyticsTab, SystemTab,
  FeedbackTab, NotificationsTab, AuditLogTab, PermissionsTab,
  DepositsTab, WhitelabelTab,
} from '../components/admin';
import { useAdminData } from '../hooks/useAdminData';

// ─── Main page ──────────────────────────────────────────────────────────────

export function AdminPage() {
  const d = useAdminData();

  if (d.loading) {
    return <div className="flex items-center justify-center h-[60vh]"><span className="loading loading-ring loading-lg text-primary" /></div>;
  }

  return (
    <>
      <div className="space-y-5 w-full">
        {/* Header + Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{d.currentTab.title}</h1>
              <span className="badge badge-error badge-sm">Admin</span>
            </div>
            <p className="text-base-content/40 text-sm mt-0.5">{d.currentTab.desc}</p>
          </div>
          <div className="flex items-center gap-2">
            <input className="input input-bordered input-sm w-48" placeholder="Qidirish (Ctrl+K)..."
              value={d.searchQuery} onChange={(e) => d.setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && d.handleSearch()} />
            <button onClick={d.handleSearch} className="btn btn-ghost btn-sm">Izlash</button>
          </div>
        </div>

        {/* Search Results */}
        {d.searchResults && (
          <div className="card bg-base-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Qidiruv natijalari</h3>
              <button className="btn btn-ghost btn-xs" onClick={() => d.setSearchResults(null)}>X</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-base-content/50 mb-1">Userlar</p>
                {(d.searchResults.users || []).map((u) => (
                  <div key={u.id} className="py-1">{u.email} <RoleBadge role={u.role as Role} /></div>
                ))}
                {!d.searchResults.users?.length && <p className="text-base-content/30 text-xs">Topilmadi</p>}
              </div>
              <div>
                <p className="text-xs text-base-content/50 mb-1">Accountlar</p>
                {(d.searchResults.accounts || []).map((a) => (
                  <div key={a.id} className="py-1">{a.name} <StatusBadge status={a.status as Account['status']} /></div>
                ))}
                {!d.searchResults.accounts?.length && <p className="text-base-content/30 text-xs">Topilmadi</p>}
              </div>
              <div>
                <p className="text-xs text-base-content/50 mb-1">Mahsulotlar</p>
                {(d.searchResults.products || []).map((p) => (
                  <div key={p.id} className="py-1 truncate">{p.title}</div>
                ))}
                {!d.searchResults.products?.length && <p className="text-base-content/30 text-xs">Topilmadi</p>}
              </div>
            </div>
          </div>
        )}

        {/* Tab content */}
        {d.activeTab === 'dashboard' && (
          <DashboardTab
            accounts={d.accounts} activeAccounts={d.activeAccounts} dueAccounts={d.dueAccounts}
            users={d.users} activeUsers={d.activeUsers} totalBalance={d.totalBalance}
            overview={d.overview} revenue={d.revenue} growth={d.growth} realtime={d.realtime}
          />
        )}

        {d.activeTab === 'accounts' && (
          <AccountsTab
            accounts={d.accounts} users={d.users}
            activeAccounts={d.activeAccounts} dueAccounts={d.dueAccounts}
            suspendedAccounts={d.suspendedAccounts} totalBalance={d.totalBalance}
            globalFeeInput={d.globalFeeInput} savingGlobalFee={d.savingGlobalFee}
            onGlobalFeeChange={d.setGlobalFeeInput} onSaveGlobalFee={d.saveGlobalFee}
            onShowCreateAccount={() => d.setShowCreateAccount(true)}
            onDepositTarget={d.setDepositTarget} onDrawerAccount={d.setDrawerAccount}
            onStatusChange={d.handleStatusChange} onRoleChange={d.handleRoleChange}
            onToggleActive={d.handleToggleActive}
            onPasswordTarget={d.setPasswordTarget}
            onSaveFee={d.saveFee} editingFee={d.editingFee} feeInput={d.feeInput}
            onEditingFeeChange={d.setEditingFee} onFeeInputChange={d.setFeeInput}
            editingPhone={d.editingPhone} phoneInput={d.phoneInput}
            onEditingPhoneChange={d.setEditingPhone} onPhoneInputChange={d.setPhoneInput}
            onSavePhone={d.savePhone}
          />
        )}

        {d.activeTab === 'analytics' && (
          <AnalyticsTab
            topUsers={d.topUsers} popularProducts={d.popularProducts}
            popularCategories={d.popularCategories}
            revenue={d.revenue} growth={d.growth}
            categoryTrends={d.categoryTrends} productHeatmap={d.productHeatmap}
          />
        )}

        {d.activeTab === 'system' && (
          <SystemTab
            health={d.health} aiUsage={d.aiUsage}
            systemErrors={d.systemErrors} errorsPage={d.errorsPage}
            onLoadErrorsPage={d.loadErrorsPage}
          />
        )}

        {d.activeTab === 'feedback' && (
          <FeedbackTab
            feedbackStats={d.feedbackStats}
            feedbackTickets={d.feedbackTickets}
            onFeedbackStatus={d.handleFeedbackStatus}
          />
        )}

        {d.activeTab === 'notifications' && (
          <NotificationsTab
            accounts={d.accounts}
            notifMsg={d.notifMsg} notifType={d.notifType} notifSending={d.notifSending}
            notifTarget={d.notifTarget} notifSelectedAccounts={d.notifSelectedAccounts}
            templates={d.templates}
            newTmplName={d.newTmplName} newTmplMsg={d.newTmplMsg} newTmplType={d.newTmplType}
            onNotifMsgChange={d.setNotifMsg} onNotifTypeChange={d.setNotifType}
            onNotifTargetChange={d.setNotifTarget} onNotifSelectedAccountsChange={d.setNotifSelectedAccounts}
            onSendNotification={d.sendNotification}
            onNewTmplNameChange={d.setNewTmplName} onNewTmplMsgChange={d.setNewTmplMsg}
            onNewTmplTypeChange={d.setNewTmplType}
            onCreateTemplate={d.createTemplate} onDeleteTemplate={d.deleteTemplate}
            onUseTemplate={d.onUseTemplate}
          />
        )}

        {d.activeTab === 'audit' && <AuditLogTab auditLog={d.auditLog} />}

        {d.activeTab === 'permissions' && <PermissionsTab />}

        {d.activeTab === 'deposits' && (
          <DepositsTab
            depositLog={d.depositLog} depositLogTotal={d.depositLogTotal}
            depositLogPage={d.depositLogPage}
            onDepositLogPageChange={d.setDepositLogPage}
            onDeleteDeposit={d.handleDeleteDeposit}
          />
        )}
      </div>

      {/* White-label tab */}
      {d.activeTab === 'whitelabel' && <WhitelabelTab />}

      {/* Modals */}
      {d.showCreateAccount && <CreateAccountModal onClose={() => d.setShowCreateAccount(false)} onDone={d.load} />}
      {d.depositTarget && <DepositModal account={d.depositTarget} onClose={() => d.setDepositTarget(null)} onDone={d.load} />}
      {d.passwordTarget && <ChangePasswordModal user={d.passwordTarget} onClose={() => d.setPasswordTarget(null)} />}

      {/* Account Detail Drawer */}
      {d.drawerAccount && (
        <AccountDrawer
          account={d.drawerAccount}
          users={d.users}
          onClose={() => d.setDrawerAccount(null)}
          onRefresh={d.load}
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
