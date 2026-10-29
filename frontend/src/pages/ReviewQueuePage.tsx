import React, { useState, useEffect } from 'react';
import { 
  ListOrdered, 
  Search, 
  Filter, 
  ArrowRight, 
  FileText, 
  Inbox,
} from 'lucide-react';
import { api } from '../api/client';
import { ContentItem } from '../types';
import { NavTab } from '../components/Sidebar';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Panel,
  Select,
  Skeleton,
  statusTone,
} from '../components/ui';

interface ReviewQueuePageProps {
  onNavigateTab: (tab: NavTab) => void;
}

export const ReviewQueuePage: React.FC<ReviewQueuePageProps> = ({ onNavigateTab }) => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getContentItems();
      setItems(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'The review queue could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesStatus = statusFilter ? item.current_status === statusFilter : true;
    const matchesSearch = search ? item.title.toLowerCase().includes(search.toLowerCase()) || (item.campaign || '').toLowerCase().includes(search.toLowerCase()) : true;
    return matchesStatus && matchesSearch;
  });

  /* Used by the "no submissions match your filters" empty state. */
  const clearFilters = () => {
    setStatusFilter('');
    setSearch('');
  };

  /* Keep the table mounted while loading or when data exists; hide it only when a
     failed fetch left us with nothing to show (the ErrorState covers that case). */
  const showTable = loading || items.length > 0 || !error;

  const skeletonRow = (i: number) => (
    <tr key={`skeleton-${i}`}>
      <td className="py-3 px-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24 mt-1.5" />
      </td>
      <td className="py-3 px-3"><Skeleton className="h-3 w-20" /></td>
      <td className="py-3 px-3"><Skeleton className="h-3 w-24" /></td>
      <td className="py-3 px-3"><Skeleton className="h-4 w-24" /></td>
      <td className="py-3 px-3"><Skeleton className="h-3 w-10" /></td>
      <td className="py-3 px-3"><Skeleton className="h-3 w-20" /></td>
      <td className="py-3 px-3"><Skeleton className="h-7 w-20" /></td>
    </tr>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        icon={<ListOrdered className="w-5 h-5" aria-hidden />}
        eyebrow="Multi-Draft Intake"
        title="Governance Review Queue"
        description="Centralized intake queue for pre-publication drafts, campaign collateral, and marketing releases."
        actions={
          <Button
            onClick={() => onNavigateTab('studio')}
            icon={<FileText className="w-4 h-4" />}
          >
            Launch Review Studio
          </Button>
        }
      />

      {error && <ErrorState message={error} onRetry={loadQueue} />}

      {/* Search and Filters */}
      <Panel className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, campaign, or tag..."
            aria-label="Search submissions by title or campaign"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-ink-faint shrink-0" aria-hidden />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter submissions by status"
            className="w-full sm:w-auto"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="CHANGES_REQUESTED">Changes Requested</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        </div>
      </Panel>

      {/* Submissions Table */}
      {showTable && (
        <Panel className="p-5 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-ink-muted font-medium">
                  <th className="py-2.5 px-3">Title & Campaign</th>
                  <th className="py-2.5 px-3">Content Type</th>
                  <th className="py-2.5 px-3">Target Audience</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Versions</th>
                  <th className="py-2.5 px-3">Last Updated</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {loading ? (
                  [0, 1, 2, 3].map(skeletonRow)
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <EmptyState
                        icon={<Inbox className="w-4 h-4" />}
                        title="The review queue is empty"
                        description="No submissions have been recorded yet. Launch the Review Studio to submit a draft for governance review."
                        action={
                          <Button size="sm" onClick={() => onNavigateTab('studio')}>
                            Launch Review Studio
                          </Button>
                        }
                      />
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <EmptyState
                        icon={<Search className="w-4 h-4" />}
                        title="No submissions match your filters"
                        description="Adjust the search term or status filter, or clear them to see the whole queue."
                        action={
                          <Button size="sm" variant="secondary" onClick={clearFilters}>
                            Clear filters
                          </Button>
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-ivory/70 transition">
                      <td className="py-3 px-3">
                        <p className="font-medium text-ink">{item.title}</p>
                        <p className="text-[11px] text-ink-muted">{item.campaign || 'Corporate Brand Communications'}</p>
                      </td>
                      <td className="py-3 px-3 font-mono text-ink-muted">
                        {item.content_type}
                      </td>
                      <td className="py-3 px-3 text-ink-muted">
                        {item.target_audience || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <Badge tone={statusTone(item.current_status)}>
                          {item.current_status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-vermilion font-semibold">
                        {item.versions_count != null ? `v${item.versions_count}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-ink-muted text-[11px]">
                        {new Date(item.updated_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onNavigateTab('studio')}
                        >
                          Inspect <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
};
