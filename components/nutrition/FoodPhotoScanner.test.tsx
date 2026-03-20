// @vitest-environment jsdom

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FoodPhotoScanner } from './FoodPhotoScanner'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

describe('FoodPhotoScanner', () => {
  beforeAll(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: vi.fn(() => 'blob:preview'),
    })

    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      writable: true,
      value: vi.fn(() => ({
        drawImage: vi.fn(),
      })),
    })

    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      writable: true,
      value: vi.fn((callback: (blob: Blob | null) => void) => {
        callback(new Blob(['image'], { type: 'image/jpeg' }))
      }),
    })

    class MockFileReader {
      result: string | ArrayBuffer | null = null
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null
      onerror: (() => void) | null = null

      readAsDataURL() {
        this.result = 'data:image/png;base64,ZmFrZQ=='
        this.onload?.({ target: { result: this.result } } as ProgressEvent<FileReader>)
      }
    }

    class MockImage {
      naturalWidth = 100
      naturalHeight = 100
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        this.onload?.()
      }
    }

    vi.stubGlobal('FileReader', MockFileReader)
    vi.stubGlobal('Image', MockImage)
  })

  beforeEach(() => {
    vi.clearAllMocks()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString()

        if (url === '/api/ai/food-scan') {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              result: {
                success: true,
                items: [
                  {
                    name: 'Pasta',
                    category: 'GRAIN',
                    estimatedGrams: 250,
                    portionDescription: '1 portion',
                    calories: 500,
                    proteinGrams: 18,
                    carbsGrams: 82,
                    fatGrams: 10,
                    fiberGrams: 4,
                  },
                ],
                totals: {
                  calories: 500,
                  proteinGrams: 18,
                  carbsGrams: 82,
                  fatGrams: 10,
                  fiberGrams: 4,
                },
                mealDescription: 'Pasta',
                suggestedMealType: 'LUNCH',
                confidence: 0.9,
                notes: [],
              },
              enhancedMode: false,
            }),
          } as Response
        }

        if (url === '/api/meals' && init?.method === 'POST') {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: { id: 'meal_1' },
            }),
          } as Response
        }

        throw new Error(`Unexpected fetch: ${url}`)
      })
    )
  })

  it('redirects back to the dashboard immediately after save when configured', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onMealSaved = vi.fn()

    const { container } = render(
      <FoodPhotoScanner
        onClose={onClose}
        onMealSaved={onMealSaved}
        redirectPathOnSave="/athlete/dashboard"
      />
    )

    const fileInput = container.querySelector('input[capture="environment"]')
    expect(fileInput).not.toBeNull()

    const file = new File(['image'], 'meal.png', { type: 'image/png' })
    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [file] },
    })

    await user.click(await screen.findByRole('button', { name: /analysera måltid/i }))
    await user.click(await screen.findByRole('button', { name: /spara måltid/i }))

    await waitFor(() => {
      expect(onMealSaved).toHaveBeenCalledWith({ id: 'meal_1' })
      expect(onClose).toHaveBeenCalled()
      expect(pushMock).toHaveBeenCalledWith('/athlete/dashboard')
    })
  })
})
