import { useState, useEffect, useMemo } from 'react';
import { Star, MessageSquare, Search, Filter, Reply, Trash2, Eye, EyeOff, ThumbsUp, ThumbsDown } from 'lucide-react';
import api from '../lib/api';
import Swal from 'sweetalert2';
import { supportAlert } from '../utils/supportAlert';
import './Reviews.css';

const STARS = [1, 2, 3, 4, 5];

function StarRating({ rating, size = 16, interactive = false, onChange }) {
  return (
    <div className="rev-stars">
      {STARS.map(s => (
        <Star
          key={s}
          size={size}
          fill={s <= rating ? '#ffd700' : 'none'}
          color={s <= rating ? '#ffd700' : '#ddd'}
          style={interactive ? { cursor: 'pointer' } : {}}
          onClick={() => interactive && onChange?.(s)}
        />
      ))}
    </div>
  );
}

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState('all');
  const [filterResponse, setFilterResponse] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([
        api.get('/reviews?limit=100'),
        api.get('/reviews/stats'),
      ]);
      setReviews(rRes.data || []);
      setStats(sRes.data || {});
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    let list = reviews;
    if (filterRating !== 'all') list = list.filter(r => r.rating === parseInt(filterRating));
    if (filterResponse === 'responded') list = list.filter(r => r.response);
    if (filterResponse === 'pending') list = list.filter(r => !r.response);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(r =>
        (r.customer_first_name || '').toLowerCase().includes(s) ||
        (r.customer_last_name || '').toLowerCase().includes(s) ||
        (r.comment || '').toLowerCase().includes(s) ||
        (r.service_name || '').toLowerCase().includes(s) ||
        (r.staff_name || '').toLowerCase().includes(s)
      );
    }
    return list;
  }, [reviews, filterRating, filterResponse, search]);

  const handleRespond = async (review) => {
    const { value: response } = await Swal.fire({
      title: 'Respond to Review',
      html: `<p style="margin-bottom:10px"><b>${review.customer_first_name} ${review.customer_last_name}</b> left a ${review.rating}-star review</p><p style="color:#666;font-style:italic;margin-bottom:16px">"${review.comment || 'No comment'}"</p>`,
      input: 'textarea', inputPlaceholder: 'Write your response...', showCancelButton: true, confirmButtonText: 'Send Response'
    });
    if (response) {
      try {
        await api.post(`/reviews/${review.id}/respond`, { response });
        Swal.fire({ icon: 'success', title: 'Response Sent!', timer: 1500, showConfirmButton: false });
        fetchAll();
      } catch(e) { Swal.fire({ icon: 'error', title: 'Error', text: e.message }); }
    }
  };

  const toggleVisibility = async (review) => {
    await api.patch(`/reviews/${review.id}`, { is_public: review.is_public ? 0 : 1 });
    fetchAll();
  };

  const handleDelete = () => supportAlert();

  const avgRating = parseFloat(stats.average_rating || 0);
  const totalReviews = stats.total_reviews || 0;

  if (loading) return <div className="rev-loading"><div className="rev-spinner" /></div>;

  return (
    <div className="rev-page">
      <div className="rev-header">
        <div>
          <h1 className="rev-title">Ratings & Reviews</h1>
          <p className="rev-subtitle">Manage client feedback and respond to reviews</p>
        </div>
      </div>

      {/* Stats overview */}
      <div className="rev-overview">
        <div className="rev-overview-left">
          <div className="rev-big-rating">{avgRating.toFixed(1)}</div>
          <StarRating rating={Math.round(avgRating)} size={24} />
          <p className="rev-total-count">{totalReviews} reviews</p>
        </div>
        <div className="rev-overview-right">
          {STARS.slice().reverse().map(star => {
            const count = stats[`${['one','two','three','four','five'][star - 1]}_star`] || 0;
            const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <div key={star} className="rev-bar-row">
                <span className="rev-bar-label">{star}</span>
                <Star size={12} fill="#ffd700" color="#ffd700" />
                <div className="rev-bar-track"><div className="rev-bar-fill" style={{ width: `${pct}%` }} /></div>
                <span className="rev-bar-count">{count}</span>
              </div>
            );
          })}
        </div>
        <div className="rev-overview-stats">
          <div className="rev-mini-stat"><ThumbsUp size={16} color="#2e7d32" /><span>{stats.last_30_days || 0}</span><label>Last 30 days</label></div>
          <div className="rev-mini-stat"><MessageSquare size={16} color="#0984e3" /><span>{stats.responded || 0}</span><label>Responded</label></div>
          <div className="rev-mini-stat"><ThumbsDown size={16} color="#c62828" /><span>{(stats.one_star || 0) + (stats.two_star || 0)}</span><label>Negative</label></div>
        </div>
      </div>

      {/* Filters */}
      <div className="rev-filters">
        <div className="rev-search-wrap">
          <Search size={16} />
          <input placeholder="Search reviews..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="rev-filter-group">
          <select value={filterRating} onChange={e => setFilterRating(e.target.value)}>
            <option value="all">All Ratings</option>
            {STARS.map(s => <option key={s} value={s}>{s} Stars</option>)}
          </select>
          <select value={filterResponse} onChange={e => setFilterResponse(e.target.value)}>
            <option value="all">All Reviews</option>
            <option value="responded">Responded</option>
            <option value="pending">Awaiting Response</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      {filtered.length === 0 ? (
        <div className="rev-empty">
          <Star size={48} strokeWidth={1} />
          <h3>No reviews yet</h3>
          <p>Reviews will appear here when clients rate their experience</p>
        </div>
      ) : (
        <div className="rev-list">
          {filtered.map(r => (
            <div key={r.id} className="rev-card">
              <div className="rev-card-top">
                <div className="rev-card-left">
                  <div className="rev-avatar">{(r.customer_first_name || 'C')[0]}</div>
                  <div>
                    <h4 className="rev-author">{r.customer_first_name} {r.customer_last_name}</h4>
                    <div className="rev-meta">
                      <StarRating rating={r.rating} size={14} />
                      <span className="rev-date">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="rev-card-tags">
                  {r.service_name && <span className="rev-tag">{r.service_name}</span>}
                  {r.staff_name && <span className="rev-tag">{r.staff_name}</span>}
                  {!r.is_public && <span className="rev-tag rev-hidden-tag"><EyeOff size={10} /> Hidden</span>}
                </div>
              </div>
              {r.comment && <p className="rev-comment">{r.comment}</p>}
              {r.response && (
                <div className="rev-response">
                  <span className="rev-response-label">Your response:</span>
                  <p>{r.response}</p>
                </div>
              )}
              <div className="rev-card-actions">
                {!r.response && <button className="rev-action-btn rev-respond-btn" onClick={() => handleRespond(r)}><Reply size={14} /> Respond</button>}
                <button className="rev-action-btn" onClick={() => toggleVisibility(r)}>{r.is_public ? <><EyeOff size={14} /> Hide</> : <><Eye size={14} /> Show</>}</button>
                <button className="rev-action-btn rev-del-btn" onClick={() => handleDelete(r)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
