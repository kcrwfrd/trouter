import { describe, it, expect, beforeEach, vi } from 'vitest'
import {defer} from '../common'

describe('defer:', () => {
  let deferred, onSuccess, onError;

  beforeEach(() => {
    deferred = defer()
    onSuccess = vi.fn()
    onError = vi.fn()
  })

  it('Should return a promise.', () => {
    expect(deferred.promise instanceof Promise).toBe(true)
  })

  it('Should invoke success handler on resolution.', () => {
    deferred.resolve('success')

    return deferred.promise.then(onSuccess).then(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('Should invoke error handler on rejection.', () => {
    deferred.reject('rejected')

    return deferred.promise
      .then(onSuccess, onError)
      .then(() => {
        expect(onSuccess).not.toHaveBeenCalled()
        expect(onError).toHaveBeenCalled()
      })
  })
})
