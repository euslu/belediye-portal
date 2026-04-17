import EmptyState from './EmptyState';
import FilterTabs from './FilterTabs';
import LoadingState from './LoadingState';
import PageHeader from './PageHeader';
import Surface from './Surface';

export default function DataTableShell({
  icon,
  title,
  description,
  meta,
  actions,
  tabs,
  activeTab,
  onTabChange,
  getTabCount,
  loading,
  error,
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  children,
}) {
  return (
    <div className="portal-page">
      <div className="space-y-6">
        <PageHeader
          icon={icon}
          title={title}
          description={description}
          meta={meta}
          actions={actions}
        />

        {tabs?.length > 0 && (
          <Surface className="p-4">
            <FilterTabs
              tabs={tabs}
              value={activeTab}
              onChange={onTabChange}
              getCount={getTabCount}
            />
          </Surface>
        )}

        {loading ? (
          <LoadingState title="Veriler hazırlanıyor" description="Liste görünümü yükleniyor." />
        ) : error ? (
          <EmptyState
            icon={<i className="bi bi-exclamation-triangle" />}
            title="Liste yüklenemedi"
            description={error}
          />
        ) : isEmpty ? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <Surface className="overflow-hidden">
            {children}
          </Surface>
        )}
      </div>
    </div>
  );
}
