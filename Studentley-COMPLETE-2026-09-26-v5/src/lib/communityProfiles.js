const rankFor = rating => rating >= 1800 ? 'Master' : rating >= 1600 ? 'Diamond' : rating >= 1400 ? 'Platinum' : rating >= 1200 ? 'Gold' : rating >= 1000 ? 'Silver' : 'Bronze'

export const COMMUNITY_PROFILES = [
  ['Emilia R.', 2480, 18, 'pro', 1865, 28, 7, '/community-avatars/emilia-lagoon.webp'],
  ['Noah K.', 2215, 12, 'plus', 1740, 24, 9, '/community-avatars/noah-mountains.webp'],
  ['Mia S.', 1970, 9, 'pro', 1625, 21, 10, ''],
  ['Leo M.', 1735, 15, null, 1510, 19, 11, ''],
  ['Sofia B.', 1490, 7, 'plus', 1435, 17, 12, ''],
  ['Finn W.', 1265, 6, null, 1360, 15, 13, ''],
  ['Lina H.', 1010, 11, 'pro', 1275, 13, 14, ''],
  ['Elias N.', 790, 4, null, 1160, 11, 15, ''],
  ['Maya L.', 560, 3, 'plus', 1045, 9, 16, ''],
  ['Ben F.', 325, 2, null, 930, 7, 18, ''],
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
