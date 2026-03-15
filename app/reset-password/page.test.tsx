// @vitest-environment jsdom

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResetPasswordPage from './page'

const pushMock = vi.fn()
const toastMock = vi.fn()
const getMock = vi.fn()
const getSessionMock = vi.fn()
const getUserMock = vi.fn()
const onAuthStateChangeMock = vi.fn()
const updateUserMock = vi.fn()
const unsubscribeMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: getMock }),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: getSessionMock,
      getUser: getUserMock,
      onAuthStateChange: onAuthStateChangeMock,
      updateUser: updateUserMock,
    },
  }),
}))

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getMock.mockReturnValue(null)
    getSessionMock.mockResolvedValue({ data: { session: null } })
    getUserMock.mockResolvedValue({ data: { user: null } })
    updateUserMock.mockResolvedValue({ error: null })
    onAuthStateChangeMock.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock,
        },
      },
    })
  })

  it('shows the reset form when the callback has already created a session', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'token' } },
    })

    render(<ResetPasswordPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Nytt lösenord')).toBeInTheDocument()
    })

    expect(screen.getByLabelText('Bekräfta lösenord')).toBeInTheDocument()
  })

  it('shows an invalid-link state when callback includes an auth error', async () => {
    getMock.mockImplementation((key: string) =>
      key === 'error' ? 'auth_callback_failed' : null
    )

    render(<ResetPasswordPage />)

    expect(
      await screen.findByText('Länken för att välja nytt lösenord är ogiltig eller har gått ut.')
    ).toBeInTheDocument()
  })

  it('lets the user request a new reset link from the invalid-link state', async () => {
    const user = userEvent.setup()
    getMock.mockImplementation((key: string) =>
      key === 'error' ? 'auth_callback_failed' : null
    )

    render(<ResetPasswordPage />)

    await user.click(
      await screen.findByRole('button', { name: 'Begär ny återställningslänk' })
    )

    expect(pushMock).toHaveBeenCalledWith('/forgot-password')
  })
})
