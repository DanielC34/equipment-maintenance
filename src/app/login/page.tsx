import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign in | EMMS',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-indigo-600">
            EMMS
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Equipment Maintenance Management System
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Sign in</h2>
          <p className="mt-1 text-sm text-gray-600">
            Use your EMMS account to access the application.
          </p>
          <div className="mt-5">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  )
}