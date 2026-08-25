import React, { useEffect, useState } from 'react';
import { contractService } from '../services/contractService.ts';
import { EventRecord } from '../types/domain.ts';

const PAGE_SIZE = 10;

export const EventTimeline: React.FC = () => {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [filterProfileId, setFilterProfileId] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchEventsPage = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      const count = await contractService.getEventCount(true);
      setTotalEvents(count);

      if (count === 0) {
        setEvents([]);
        return;
      }

      const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
      const targetPage = Math.min(Math.max(1, page), totalPages);
      setCurrentPage(targetPage);

      // Fetch the page from the newest events down to older
      const startIdx = (targetPage - 1) * PAGE_SIZE;
      const startId = Math.max(1, count - startIdx - PAGE_SIZE + 1);
      const endId = count - startIdx;
      const ids = Array.from({ length: endId - startId + 1 }, (_, i) => endId - i);

      const list = await Promise.all(
        ids.map(async (id) => {
          try {
            return await contractService.getEvent(id);
          } catch {
            return null;
          }
        })
      );
      setEvents(list.filter((e): e is EventRecord => e !== null));
    } catch (err: any) {
      setError(err?.message || 'Failed to load event logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventsPage(1);
  }, []);

  const filteredEvents = events.filter((e) => {
    if (filterProfileId && e.profile_id !== Number(filterProfileId)) {
      return false;
    }
    if (filterType && !e.event_type.toLowerCase().includes(filterType.toLowerCase())) {
      return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(totalEvents / PAGE_SIZE));

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Immutable Event History & Audit Trail</h2>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => fetchEventsPage(currentPage)}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Logs'}
        </button>
      </div>
      <p className="card-desc">
        Complete sequence of on-chain state transitions and cryptographic actions recorded in contract storage.
      </p>

      {error && (
        <div className="alert-banner alert-error" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label htmlFor="filter-event-profile" className="form-label">
            Filter Visible Page by Profile ID
          </label>
          <input
            id="filter-event-profile"
            type="number"
            min="1"
            className="form-input"
            placeholder="All profiles"
            value={filterProfileId}
            onChange={(e) => setFilterProfileId(e.target.value)}
          />
        </div>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label htmlFor="filter-event-type" className="form-label">
            Filter Visible Page by Event Type
          </label>
          <input
            id="filter-event-type"
            type="text"
            className="form-input"
            placeholder="e.g. PROFILE_CREATED, MAPPING_ACCEPTED"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {totalEvents} Total Events (Page {currentPage} of {totalPages})
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchEventsPage(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
          >
            &larr; Newer Events
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchEventsPage(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
          >
            Older Events &rarr;
          </button>
        </div>
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label="Immutable Event History Table"
        style={{ overflowX: 'auto' }}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Event ID</th>
              <th>Profile</th>
              <th>Event Type</th>
              <th>Actor</th>
              <th>Details</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length > 0 ? (
              filteredEvents.map((ev) => (
                <tr key={ev.event_id}>
                  <td className="mono">#{ev.event_id}</td>
                  <td className="mono">#{ev.profile_id}</td>
                  <td>
                    <strong>{ev.event_type}</strong>
                  </td>
                  <td className="mono" title={ev.actor}>
                    {ev.actor ? `${ev.actor.slice(0, 6)}...${ev.actor.slice(-4)}` : '-'}
                  </td>
                  <td className="mono" style={{ fontSize: '12px' }}>
                    {ev.details}
                  </td>
                  <td className="mono" style={{ fontSize: '12px' }}>
                    {ev.timestamp}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  {loading ? 'Loading events...' : 'No matching audit events found on this page.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
