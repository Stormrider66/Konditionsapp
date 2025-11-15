// lib/db-mock.ts
// Mock in-memory database for testing without real Supabase connection
// This will be replaced with real Prisma queries when database is set up

import type { Client, Test, TestStage, Gender, TestType, TestStatus } from '@/types'

// In-memory storage
const clients = new Map<string, Client>()
const tests = new Map<string, Test>()
const testStages = new Map<string, TestStage[]>()

// Helper to generate UUIDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Mock User (hardcoded for now)
const mockUserId = 'mock-user-001'

// CLIENT OPERATIONS
export const mockDb = {
  client: {
    findMany: async (): Promise<Client[]> => {
      return Array.from(clients.values())
    },

    findUnique: async (id: string): Promise<Client | null> => {
      return clients.get(id) || null
    },

    create: async (data: {
      name: string
      email?: string
      phone?: string
      gender: Gender
      birthDate: Date
      height: number
      weight: number
      notes?: string
    }): Promise<Client> => {
      const id = generateId()
      const now = new Date()
      const client: Client = {
        id,
        userId: mockUserId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        gender: data.gender,
        birthDate: data.birthDate,
        height: data.height,
        weight: data.weight,
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
      }
      clients.set(id, client)
      return client
    },

    update: async (id: string, data: Partial<Client>): Promise<Client | null> => {
      const existing = clients.get(id)
      if (!existing) return null

      const updated: Client = {
        ...existing,
        ...data,
        id: existing.id, // Don't allow ID change
        createdAt: existing.createdAt, // Don't allow createdAt change
        updatedAt: new Date(),
      }
      clients.set(id, updated)
      return updated
    },

    delete: async (id: string): Promise<boolean> => {
      // Also delete associated tests
      const clientTests = Array.from(tests.values()).filter(t => t.clientId === id)
      clientTests.forEach(test => {
        tests.delete(test.id)
        testStages.delete(test.id)
      })

      return clients.delete(id)
    },
  },

  test: {
    findMany: async (filter?: { clientId?: string }): Promise<Test[]> => {
      let allTests = Array.from(tests.values())

      if (filter?.clientId) {
        allTests = allTests.filter(t => t.clientId === filter.clientId)
      }

      // Add test stages to each test
      return allTests.map(test => ({
        ...test,
        testStages: testStages.get(test.id) || [],
      }))
    },

    findUnique: async (id: string): Promise<Test | null> => {
      const test = tests.get(id)
      if (!test) return null

      return {
        ...test,
        testStages: testStages.get(id) || [],
      }
    },

    create: async (data: {
      clientId: string
      testDate: Date
      testType: TestType
      stages: Array<{
        duration: number
        heartRate: number
        lactate: number
        vo2?: number
        speed?: number
        incline?: number
        power?: number
        cadence?: number
        pace?: number
      }>
      notes?: string
    }): Promise<Test> => {
      const id = generateId()
      const now = new Date()

      const test: Test = {
        id,
        clientId: data.clientId,
        userId: mockUserId,
        testDate: data.testDate,
        testType: data.testType,
        status: 'DRAFT' as TestStatus,
        notes: data.notes,
        testStages: [],
      }

      // Create test stages
      const stages: TestStage[] = data.stages.map((stage, index) => ({
        id: generateId(),
        testId: id,
        sequence: index,
        duration: stage.duration,
        heartRate: stage.heartRate,
        lactate: stage.lactate,
        vo2: stage.vo2,
        speed: stage.speed,
        incline: stage.incline,
        power: stage.power,
        cadence: stage.cadence,
        pace: stage.pace,
        economy: stage.speed && stage.vo2 ? stage.vo2 / stage.speed : undefined,
        wattsPerKg: undefined, // Will be calculated
      }))

      tests.set(id, test)
      testStages.set(id, stages)

      test.testStages = stages
      return test
    },

    update: async (
      id: string,
      data: {
        status?: TestStatus
        maxHR?: number
        maxLactate?: number
        vo2max?: number
        aerobicThreshold?: any
        anaerobicThreshold?: any
        trainingZones?: any[]
        notes?: string
      }
    ): Promise<Test | null> => {
      const existing = tests.get(id)
      if (!existing) return null

      const updated: Test = {
        ...existing,
        ...data,
        id: existing.id,
        testStages: testStages.get(id) || [],
      }

      tests.set(id, updated)
      return updated
    },

    delete: async (id: string): Promise<boolean> => {
      testStages.delete(id)
      return tests.delete(id)
    },
  },

  // Helper to seed some sample data
  seed: () => {
    // Create sample clients
    const client1: Client = {
      id: 'sample-client-1',
      userId: mockUserId,
      name: 'Joakim Hällgren',
      email: 'joakim@example.com',
      phone: '070-1234567',
      gender: 'MALE' as Gender,
      birthDate: new Date('1992-01-01'),
      height: 186,
      weight: 88,
      notes: 'Löpare',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const client2: Client = {
      id: 'sample-client-2',
      userId: mockUserId,
      name: 'Anna Svensson',
      email: 'anna@example.com',
      gender: 'FEMALE' as Gender,
      birthDate: new Date('1988-05-15'),
      height: 170,
      weight: 65,
      notes: 'Cyklist',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    clients.set(client1.id, client1)
    clients.set(client2.id, client2)

    console.log('Mock database seeded with sample data')
  },

  // Clear all data
  clear: () => {
    clients.clear()
    tests.clear()
    testStages.clear()
  },
}

// Initialize with sample data
if (typeof window === 'undefined') {
  // Only seed on server side
  mockDb.seed()
}
