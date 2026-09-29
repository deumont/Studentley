const rankFor = rating => rating >= 1800 ? 'Master' : rating >= 1600 ? 'Diamond' : rating >= 1400 ? 'Platinum' : rating >= 1200 ? 'Gold' : rating >= 1000 ? 'Silver' : 'Bronze'

export const COMMUNITY_PROFILES = [
  ['Emilia R.', 2140, 18, 'pro', 1630, 28, 7, '/community-avatars/emilia-lagoon.webp'],
  ['Noah K.', 1930, 12, 'plus', 1530, 24, 9, '/community-avatars/noah-mountains.webp'],
  ['Mia S.', 1725, 9, 'pro', 1430, 21, 10, ''],
  ['Leo M.', 1510, 15, null, 1340, 19, 11, ''],
  ['Sofia B.', 1310, 7, 'plus', 1260, 17, 12, ''],
  ['Finn W.', 1115, 6, null, 1190, 15, 13, ''],
  ['Lina H.', 890, 11, 'pro', 1110, 13, 14, ''],
  ['Elias N.', 700, 4, null, 1010, 11, 15, ''],
  ['Maya L.', 495, 3, 'plus', 920, 9, 16, ''],
  ['Ben F.', 290, 2, null, 820, 7, 18, ''],
].map(([display_name, study_points, current_streak, plan_badge, rating, wins, losses, avatar_path], index) => ({
  user_id: `community-${index + 1}`,
  display_name,
  avatar_path,
  avatar_bucket: 'public',
  plan_badge,
  study_points,
  current_streak,
  rating,
  rank: rankFor(rating),
  wins,
  losses,
  is_current_user: false,
}))

const withoutDuplicateNames = entries => {
  const realNames = new Set(entries.map(entry => String(entry.display_name || '').toLowerCase()))
  return COMMUNITY_PROFILES.filter(entry => !realNames.has(entry.display_name.toLowerCase()))
}

export function withCommunityStudyLeaderboard(entries = []) {
  return [...entries, ...withoutDuplicateNames(entries)]
    .sort((left, right) => Number(right.study_points || 0) - Number(left.study_points || 0) || Number(right.current_streak || 0) - Number(left.current_streak || 0))
    .map((entry, index) => ({ ...entry, position: index + 1 }))
}

export function withCommunityRivalsLeaderboard(entries = []) {
  return [...entries, ...withoutDuplicateNames(entries)]
    .sort((left, right) => Number(right.rating || 0) - Number(left.rating || 0))
    .map((entry, index) => ({ ...entry, position: index + 1 }))
}
