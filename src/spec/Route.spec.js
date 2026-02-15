import { describe, it, expect, beforeEach, vi } from 'vitest'
import Route from '../Route'
import {defer} from '../common'

describe('Route:', () => {
  let route;

  beforeEach(() => {
    route = new Route({
      name: 'foo',
      url: '/foo/:fooId/bar/:barId',
      controller: () => {},
      path: []
    })
  })

  it('Should properly instantiate.', () => {
    expect(route).toBeDefined()
    expect(route.getRoot()).toBe(route)
    expect(route.getFqn()).toBe('foo')
  })

  it('Should parse param names from URL pattern.', () => {
    expect(route.params).toEqual(['fooId', 'barId'])
  })

  it('Should not have parent route params.', () => {
    let child = new Route({
      name: 'foo.bat',
      url: '/bat/:batId',
      parent: route,
      path: [route],
    })

    expect(child.params).toEqual(['batId'])
  })

  describe('Resolve:', () => {
    let controller, deferred, route, resolve;

    beforeEach(() => {
      controller = vi.fn()
      deferred = defer()
      resolve = vi.fn().mockReturnValue(deferred.promise)

      route = new Route({
        name: 'foo',
        controller: controller,
        resolve: resolve,
        path: []
      })

      route.enter({ fooId: '1' })
    })

    it('Should resolve promises before controller instantiation.', () => {
      expect(controller).not.toHaveBeenCalled()

      deferred.resolve('bar')

      return deferred.promise.then(() => {
        expect(controller).toHaveBeenCalled()
      })
    })

    it('Should instantiate the controller with resolved values as arguments.', () => {
      deferred.resolve('bar')

      return deferred.promise.then(() => {
        expect(controller).toHaveBeenCalledWith(
          expect.objectContaining({ fooId: '1' }),
          'bar'
        )
      })
    })

    it('Should call resolve with route params.', () => {
      expect(resolve).toHaveBeenCalledWith(
        expect.objectContaining({ fooId: '1' })
      )
    })

    it('Should instantiate the controller with named resolves.', () => {
      let foo = defer()
      let bar = defer()

      let route = new Route({
        name: 'foo',
        controller: controller,
        resolve: {
          foo: (() => foo.promise),
          bar: (() => bar.promise)
        },
        path: [],
      })

      foo.resolve('Foo')
      bar.resolve('Bar')

      return route.enter().then(() => {
        let [params, resolve] = controller.mock.calls[controller.mock.calls.length - 1]

        expect(params).toEqual({})

        expect(resolve).toEqual({
          foo: 'Foo',
          bar: 'Bar',
        })
      })
    })

    describe('Defined on Controller:', () => {
      let deferred, route;

      class Controller {
        static resolve(routeParams) {}
      }

      beforeEach(() => {
        deferred = defer()

        vi.spyOn(Controller, 'resolve').mockReturnValue(deferred.promise)

        route = new Route({
          name: 'foo',
          controller: Controller,
          path: []
        })
      })

      it("Should call a controller's static resolve method if defined.", () => {
        route.enter()

        expect(Controller.resolve).toHaveBeenCalled()
      })

      it("Should call a controller's static resolve method with route params.", () => {
        route.enter({ fooId: '1' })

        expect(Controller.resolve).toHaveBeenCalledWith(
          expect.objectContaining({ fooId: '1' })
        )
      })

      it('Should throw an error if resolve defined on both controller and route.', () => {
        expect(() => {
          new Route({
            name: 'foo',
            controller: Controller,
            resolve: (() => deferred.promise),
            path: []
          })
        }).toThrow(
          new Error('Resolve cannot be defined on both controller and route.')
        )
      })
    })

  })

  describe('href(params):', () => {
    let route;

    beforeEach(() => {
      route = new Route({
        name: 'foo',
        url: '/foo/:fooId',
        controller: () => {},
        path: []
      })
    })

    it('Should return the URL for route with param.', () => {
      expect(route.href({ fooId: 1})).toBe('/foo/1')
    })

    it('Should return the URL for complex route with params.', () => {
      route.url = '/foo/:fooId/bar/baz/:bazId'

      let href = route.href({ fooId: 1, bazId: 2})

      expect(href).toBe('/foo/1/bar/baz/2')
    })

    it('Should throw an error if required param is missing.', () => {
      expect(() => route.href()).toThrow(
        new Error("Missing required param 'fooId'")
      )
    })

    it('Should return the URL with a defined query parameter.', () => {
      route.url = "/foo/:fooId?barId"

      expect(route.href({ fooId: 1, barId: 2})).toBe('/foo/1?barId=2')
    })

    it('Should return the URL with multiple query parameters.', () => {
      route.url = "/foo/:fooId?barId&bizId"

      let url = route.href({ fooId: 1, barId: 2, bizId: 3})

      expect(url).toBe('/foo/1?barId=2&bizId=3')
    })

    it('Should return the URL without an undefined query parameter.', () => {
      route.url = "/foo/:fooId?barId"

      expect(route.href({ fooId: 1})).toBe('/foo/1')
    })
  })
})
