// src/components/MainDashboard/Modals/reviews/reviewsFilters.types.ts
export type RatingBucket =
  | 'all'
  | '5only'
  | 'lte4'
  | 'lte3'
  | 'lte2'
  | '1only';

export type CommentFilter = 'all' | 'withComment' | 'withoutComment';

export type SortKey = 'recent' | 'oldest' | 'ratingLow' | 'ratingHigh';

export type DateRangeKey =
  | 'all'
  | 'today'
  | 'last7d'
  | 'last30d'
  | 'last90d'
  | 'custom';

/** Common filter shape every tab uses. */
export interface ReviewsFilters {
  search: string;
  tenant: string; // 'all' | slug
  rating: RatingBucket;
  comment: CommentFilter;
  sort: SortKey;
  dateRange: DateRangeKey;
  customFrom: string;
  customTo: string;
}

export const EMPTY_REVIEWS_FILTERS: ReviewsFilters = {
  search: '',
  tenant: 'all',
  rating: 'all',
  comment: 'all',
  sort: 'recent',
  dateRange: 'all',
  customFrom: '',
  customTo: '',
};

/** Chip option lists used in the sheet. */
export const RATING_OPTIONS: { key: RatingBucket; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: '5only', label: '5 stars only' },
  { key: 'lte4', label: '≤ 4 stars' },
  { key: 'lte3', label: '≤ 3 stars' },
  { key: 'lte2', label: '≤ 2 stars' },
  { key: '1only', label: '1 star only' },
];

export const COMMENT_OPTIONS: { key: CommentFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'withComment', label: 'With comment' },
  { key: 'withoutComment', label: 'Without comment' },
];

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'ratingLow', label: 'Rating: Low → High' },
  { key: 'ratingHigh', label: 'Rating: High → Low' },
];

export const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'last7d', label: 'Last 7 days' },
  { key: 'last30d', label: 'Last 30 days' },
  { key: 'last90d', label: 'Last 90 days' },
  { key: 'custom', label: 'Custom range' },
];

// ---------- Helpers ----------
export const isRatingInBucket = (rating: number, bucket: RatingBucket) => {
  switch (bucket) {
    case 'all':
      return true;
    case '5only':
      return rating === 5;
    case '1only':
      return rating === 1;
    case 'lte4':
      return rating <= 4;
    case 'lte3':
      return rating <= 3;
    case 'lte2':
      return rating <= 2;
    default:
      return true;
  }
};

export const isCommentInFilter = (
  comment: string | undefined,
  filter: CommentFilter,
) => {
  const has = !!comment && comment.trim() !== '';
  switch (filter) {
    case 'withComment':
      return has;
    case 'withoutComment':
      return !has;
    default:
      return true;
  }
};

export const isDateInRange = (
  isoDate: string,
  range: DateRangeKey,
  from: string,
  to: string,
): boolean => {
  if (range === 'all') return true;
  const ts = new Date(isoDate).getTime();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  switch (range) {
    case 'today': {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return ts >= start.getTime() && ts <= now;
    }
    case 'last7d':
      return ts >= now - 7 * day;
    case 'last30d':
      return ts >= now - 30 * day;
    case 'last90d':
      return ts >= now - 90 * day;
    case 'custom': {
      if (from) {
        const d = new Date(from);
        d.setHours(0, 0, 0, 0);
        if (ts < d.getTime()) return false;
      }
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        if (ts > d.getTime()) return false;
      }
      return true;
    }
    default:
      return true;
  }
};

export const countActiveFilters = (f: ReviewsFilters): number => {
  let n = 0;
  if (f.tenant !== 'all') n++;
  if (f.rating !== 'all') n++;
  if (f.comment !== 'all') n++;
  if (f.sort !== 'recent') n++;
  if (f.dateRange !== 'all') n++;
  return n;
};