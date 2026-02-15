import { describe, it, expect, beforeEach, vi } from 'vitest'
import UrlRouter from '../UrlRouter'

describe('UrlRouter:', () => {
  let urlRouter, foo, bar, index;

  beforeEach(() => {
    urlRouter = new UrlRouter()
    index = vi.fn()
    foo = vi.fn()
    bar = vi.fn()

    urlRouter.when('/', index)
    urlRouter.when('/foo/:fooId', foo)
    urlRouter.when('/foo/:fooId/bar/:barId', bar)
  })

  describe('onChange(hash):', () => {
    it('Should call handler for an index route.', () => {
      urlRouter.onChange('#!/')

      expect(index).toHaveBeenCalled()
    })

    it('Should call handler when match is found.', () => {
      urlRouter.onChange('#!/foo/1')

      expect(foo).toHaveBeenCalled()
      expect(foo.mock.calls[foo.mock.calls.length - 1][0]).toEqual({
        fooId: '1'
      })
    })

    it('Should call correct handler when child match is found.', () => {
      urlRouter.onChange('#!/foo/1/bar/2')

      expect(foo).not.toHaveBeenCalled()
      expect(bar).toHaveBeenCalled()
      expect(bar.mock.calls[bar.mock.calls.length - 1][0]).toEqual({
        fooId: '1',
        barId: '2'
      })
    })

    it('Should log a warning if no match found.', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      urlRouter.onChange('#!/foo/1/bar')

      expect(console.warn).toHaveBeenCalledWith(
        "No route handler found for '/foo/1/bar'"
      )
    })

    it('Should redirect to default route if no match found.', () => {
      vi.spyOn(urlRouter, 'onChange')

      urlRouter.otherwise('/')

      urlRouter.onChange('#!/foo/1/bar')

      expect(urlRouter.onChange).toHaveBeenCalledWith('#!/')
      expect(index).toHaveBeenCalled()
    })
  })
})
