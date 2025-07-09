export interface User {
  id: string
  email: string
  fullName: string
  role: 'user' | 'superadmin'
}

export interface AuthPayload {
  user: User
  token: string
}

export interface RegisterInput {
  fullName: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}