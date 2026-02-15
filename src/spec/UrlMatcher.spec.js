import { describe, it, expect, beforeEach } from 'vitest'
import UrlMatcher from '../UrlMatcher'

describe('UrlMatcher:', () => {
  let urlMatcher, foo;

  describe('getParams(urlPattern):', () => {
    it('Should extract param names.', () => {
      let params = UrlMatcher.getParams('/foo/:fooId/bar/:barId')

      expect(params).toEqual(['fooId', 'barId'])
    })
  })

  describe('Plain Routes:', () => {
    beforeEach(() => {
      urlMatcher = new UrlMatcher('/foo')
    })

    it('Should match a plain route.', () => {
      expect(urlMatcher.exec('/foo')).toEqual({})
    })

    it('Should not match the wrong route.', () => {
      expect(urlMatcher.exec('/bar')).toBe(null)
    })

    it('Should match the entire route.', () => {
      expect(urlMatcher.exec('/foo/bar')).toBe(null)
    })

    it('Should match the route with query args added.', () => {
      expect(urlMatcher.exec('/foo?bar=2')).toEqual({})
    })

    it('Should match an index route.', () => {
      let urlMatcher = new UrlMatcher('/')

      expect(urlMatcher.exec('/')).toEqual({})
    })
  })

  describe('Routes with Params:', () => {
    beforeEach(() => {
      urlMatcher = new UrlMatcher('/foo/:fooId')
    })

    it('Should match the correct route.', () => {
      expect(urlMatcher.exec('/foo/1')).toEqual({ fooId: '1'})
    })

    it('Should not match route with missing param.', () => {
      expect(urlMatcher.exec('/foo/')).toBe(null)
      expect(urlMatcher.exec('/foo')).toBe(null)
    })

    it('Should not match a child route.', () => {
      expect(urlMatcher.exec('/foo/1/bar')).toBe(null)
    })

    it('Should match a route with multiple params.', () => {
      urlMatcher = new UrlMatcher('/foo/:fooId/bar/:barId')

      expect(urlMatcher.exec('/foo/1/bar/2')).toEqual({
        fooId: '1',
        barId: '2',
      })
    })
  })

  describe('Routes with query params:', () => {
    beforeEach(() => {
      urlMatcher = new UrlMatcher('/foo/:fooId?barId')
    })

    it('Should have the query param.', () => {
      expect(urlMatcher.queryParams).toEqual(['barId'])
    })

    it('Should match a route with the query param.', () => {
      expect(urlMatcher.exec('/foo/1?barId=2')).toEqual({
        fooId: '1',
        barId: '2',
      })
    })

    it('Should match a route with the query param omitted', () => {
      expect(urlMatcher.exec('/foo/1')).toEqual({
        fooId: '1',
        barId: null,
      })
    })

    it('Should match an index route with query param.', () => {
      let urlMatcher = new UrlMatcher('/?foo')

      expect(urlMatcher.exec('/?foo=1')).toEqual({ foo: '1' })
    })

    describe('With multiple query params:', () => {
      beforeEach(() => {
        urlMatcher = new UrlMatcher('/foo/:fooId?barId&bazId')
      })

      it('Should have the query param.', () => {
      expect(urlMatcher.queryParams).toEqual(['barId', 'bazId'])
    })

      it('Should match a route with multiple query params.', () => {
        expect(urlMatcher.exec('/foo/1?barId=2&bazId=3')).toEqual({
          fooId: '1',
          barId: '2',
          bazId: '3',
        })
      })

      it('Should match a route with query params in different order.', () => {
        expect(urlMatcher.exec('/foo/1?barId=2&bazId=3')).toEqual({
          fooId: '1',
          barId: '2',
          bazId: '3',
        })
      })

      it('Should match a route with 1 query param omitted.', () => {
        expect(urlMatcher.exec('/foo/1?barId=2')).toEqual({
          fooId: '1',
          barId: '2',
          bazId: null,
        })
      })

      it('Should match a param value of a URI-encoded JSON blob.', () => {
        let urlMatcher = new UrlMatcher('/?foo')
        let value = '%7B%22test%22%3A%7B%22a%22%3A%5B%22hi%22%2Cnull%5D%7D%7D'

        expect(urlMatcher.exec(`/?foo=${value}`)).toEqual({
          foo: value
        })
      })
    })
  })
})
