// @vitest-environment jsdom

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FoodPhotoScanner } from './FoodPhotoScanner'

const pushMock = vi.fn()
const baseAnalysisResult = {
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
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

describe('FoodPhotoScanner', () => {
  let refineRequestBody: Record<string, unknown> | null
  let refineResponse: Record<string, unknown>

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
    refineRequestBody = null
    refineResponse = {
      result: {
        success: true,
        items: [
          {
            name: 'Morot',
            category: 'VEGETABLE',
            estimatedGrams: 240,
            portionDescription: '4 st',
            calories: 100,
            proteinGrams: 2,
            carbsGrams: 24,
            fatGrams: 0.4,
            fiberGrams: 7,
          },
        ],
        totals: {
          calories: 100,
          proteinGrams: 2,
          carbsGrams: 24,
          fatGrams: 0.4,
          fiberGrams: 7,
        },
        mealDescription: 'Stor portion morot',
        suggestedMealType: 'AFTERNOON_SNACK',
        confidence: 0.88,
        notes: ['uppdaterad'],
      },
      enhancedMode: false,
    }

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString()

        if (url === '/api/ai/food-scan') {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              result: baseAnalysisResult,
              enhancedMode: false,
            }),
          } as Response
        }

        if (url === '/api/ai/food-scan/refine' && init?.method === 'POST') {
          refineRequestBody = JSON.parse(String(init.body || '{}')) as Record<string, unknown>
          return {
            ok: true,
            status: 200,
            json: async () => refineResponse,
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

  it('re-sends the normalized image file during refine and updates the review state', async () => {
    const user = userEvent.setup()

    const { container } = render(<FoodPhotoScanner />)

    const fileInput = container.querySelector('input[capture="environment"]')
    expect(fileInput).not.toBeNull()

    const file = new File(['image'], 'meal.png', { type: 'image/png' })
    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [file] },
    })

    await user.click(await screen.findByRole('button', { name: /analysera måltid/i }))
    expect(await screen.findByDisplayValue('Pasta')).toBeInTheDocument()

    const textareas = container.querySelectorAll('textarea')
    expect(textareas.length).toBeGreaterThan(0)
    await user.type(textareas[0] as HTMLTextAreaElement, 'portionen var större')
    await user.click(screen.getAllByRole('button', { name: /^uppdatera analys$/i }).at(-1)!)

    await waitFor(() => {
      expect(refineRequestBody).not.toBeNull()
      expect(refineRequestBody?.refinementText).toBe('portionen var större')
      expect(refineRequestBody?.imageBase64).toBe('ZmFrZQ==')
      expect(refineRequestBody?.imageMimeType).toBe('image/jpeg')
      expect(screen.getByDisplayValue('Morot')).toBeInTheDocument()
      expect(screen.getByDisplayValue('4 st')).toBeInTheDocument()
    })
  })

  it('shows an error instead of silently doing nothing when refine returns success false', async () => {
    refineResponse = {
      result: {
        success: false,
        items: [],
        totals: {
          calories: 0,
          proteinGrams: 0,
          carbsGrams: 0,
          fatGrams: 0,
          fiberGrams: 0,
        },
        mealDescription: 'Ingen uppdatering',
        confidence: 0.2,
        notes: ['oklar korrigering'],
      },
      enhancedMode: false,
    }

    const user = userEvent.setup()

    const { container } = render(<FoodPhotoScanner />)

    const fileInput = container.querySelector('input[capture="environment"]')
    expect(fileInput).not.toBeNull()

    const file = new File(['image'], 'meal.png', { type: 'image/png' })
    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [file] },
    })

    await user.click(await screen.findByRole('button', { name: /analysera måltid/i }))

    const textareas = container.querySelectorAll('textarea')
    await user.type(textareas[0] as HTMLTextAreaElement, 'det var något annat')
    await user.click(screen.getAllByRole('button', { name: /^uppdatera analys$/i }).at(-1)!)

    await waitFor(() => {
      expect(
        screen.getByText(/kunde inte uppdatera analysen utifrån korrigeringen/i)
      ).toBeInTheDocument()
      expect(textareas[0]).toHaveValue('det var något annat')
    })
  })
})
