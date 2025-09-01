// Test setup for Vitest
import { beforeEach } from 'vitest'

// Mock DOM globals that ProseMirror expects
global.window = global.window || {}
global.document = global.document || {}
global.navigator = global.navigator || {}

beforeEach(() => {
  // Reset any global state before each test
  if (typeof window !== 'undefined') {
    window.__PM_DEBUG = false
  }
})
