export async function requireUser(request) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) throw Object.assign(new Error('Authentication required.'), { status: 401 })
  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_SERVICE_ROLE_KEY } })
  if (!response.ok) throw Object.assign(new Error('Your session is invalid or expired.'), { status: 401 })
  return response.json()
}
