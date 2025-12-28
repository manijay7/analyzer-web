const { mockDeep, mockReset } = require('jest-mock-extended')

const prismaMock = mockDeep()

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => prismaMock),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

module.exports = {
  prismaMock,
  mockReset,
}