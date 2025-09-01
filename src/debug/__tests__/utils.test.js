import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PM_DEBUG, snapshotTracker, debugGroup, debugLogDispatch } from '../utils.js'

describe('Debug Utilities', () => {
  beforeEach(() => {
    global.window = { __PM_DEBUG: false }
    global.console = {
      groupCollapsed: vi.fn(),
      groupEnd: vi.fn(),
      log: vi.fn()
    }
  })

  describe('PM_DEBUG', () => {
    it('should return false when debug is disabled', () => {
      global.window.__PM_DEBUG = false
      expect(PM_DEBUG()).toBe(false)
    })

    it('should return true when debug is enabled', () => {
      global.window.__PM_DEBUG = true
      expect(PM_DEBUG()).toBe(true)
    })

    it('should return false when window is undefined', () => {
      global.window = undefined
      expect(PM_DEBUG()).toBe(false)
    })
  })

  describe('snapshotTracker', () => {
    it('should return null for invalid tracker', () => {
      expect(snapshotTracker(null)).toBe(null)
      expect(snapshotTracker(undefined)).toBe(null)
    })

    it('should snapshot valid tracker', () => {
      const tracker = {
        from: 10,
        to: 20,
        markers: [1, 2, 3]
      }

      const snapshot = snapshotTracker(tracker)
      
      expect(snapshot).toEqual({
        from: 10,
        to: 20,
        markers: [1, 2, 3]
      })
      expect(snapshot.markers).not.toBe(tracker.markers) // should be a copy
    })

    it('should handle partial tracker data', () => {
      const tracker = { from: 'invalid', markers: null }
      const snapshot = snapshotTracker(tracker)
      
      expect(snapshot).toEqual({
        from: null,
        to: null,
        markers: null
      })
    })
  })

  describe('debugGroup', () => {
    it('should execute function normally when debug disabled', () => {
      global.window.__PM_DEBUG = false
      const fn = vi.fn(() => 'result')
      
      const result = debugGroup('test', fn)
      
      expect(result).toBe('result')
      expect(fn).toHaveBeenCalled()
      expect(console.groupCollapsed).not.toHaveBeenCalled()
    })

    it('should wrap in console group when debug enabled', () => {
      global.window.__PM_DEBUG = true
      const fn = vi.fn(() => 'result')
      
      const result = debugGroup('test label', fn)
      
      expect(result).toBe('result')
      expect(console.groupCollapsed).toHaveBeenCalledWith('test label')
      expect(console.groupEnd).toHaveBeenCalled()
    })
  })

  describe('debugLogDispatch', () => {
    it('should not log when debug disabled', () => {
      global.window.__PM_DEBUG = false
      const mockView = {
        state: {
          selection: { from: 1, to: 5 }
        }
      }
      const mockTr = {
        steps: [{ constructor: { name: 'ReplaceStep' } }]
      }

      debugLogDispatch(mockView, mockTr, null, null)
      
      expect(console.log).not.toHaveBeenCalled()
    })

    it('should log when debug enabled', () => {
      global.window.__PM_DEBUG = true
      const mockView = {
        state: {
          selection: { from: 1, to: 5 }
        }
      }
      const mockTr = {
        steps: [{ constructor: { name: 'ReplaceStep' } }]
      }

      debugLogDispatch(mockView, mockTr, { from: 1, to: 3 }, { from: 2, to: 4 })
      
      expect(console.log).toHaveBeenCalledTimes(2)
    })
  })
})
