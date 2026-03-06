import path from 'path'

export const AUTH_STATE_DIR = path.join(process.cwd(), 'playwright', '.auth')

export const AUTH_STATE_PATHS = {
  athlete: path.join(AUTH_STATE_DIR, 'athlete.json'),
  admin: path.join(AUTH_STATE_DIR, 'admin.json'),
  coach: path.join(AUTH_STATE_DIR, 'coach.json'),
  physio: path.join(AUTH_STATE_DIR, 'physio.json'),
} as const
