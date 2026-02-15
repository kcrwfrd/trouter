import { describe, it, expect, beforeEach, vi } from 'vitest'
import Router from '../Router'
import {defer} from '../common'

describe('Router:', () => {
  let router, homeCtrl, childCtrl, siblingCtrl,
  grandChildCtrl, fooCtrl, barCtrl, bazCtrl, bazDeferred, bizCtrl;

  beforeEach(() => {
    router = new Router()

    homeCtrl = vi.fn()
    childCtrl = vi.fn()
    siblingCtrl = vi.fn()
    grandChildCtrl = vi.fn()
    fooCtrl = vi.fn()
    barCtrl = vi.fn()
    bazCtrl = vi.fn()
    bizCtrl = vi.fn()

    bazDeferred = defer()

    router.route('home', {
        controller: homeCtrl,
        url: '/home'
      })
      .route('home.child', {
        controller: childCtrl,
        url: '/child'
      })
      .route('home.sibling', {
        controller: siblingCtrl,
        url: '/sibling'
      })
      .route('home.child.grandChild', {
        controller: grandChildCtrl,
        url: '/grandChild'
      })
      .route('foo', {
        controller: fooCtrl,
        url: '/foo/:fooId'
      })
      .route('foo.bar', {
        controller: barCtrl,
        title: 'Bar',
        url: '/bar/:barId'
      })
      .route('foo.baz', {
        controller: bazCtrl,
        title: 'Baz',
        url: '/baz/:bazId',
        resolve: () => bazDeferred.promise
      })
      .route('foo.biz', {
        controller: bizCtrl,
        title: 'Biz',
        url: '/biz?bizId'
      })
  })

  describe('go(name):', () => {
    it('Should invoke the controller bound to the route.', () => {
      return router.go('home').then(() => {
        expect(homeCtrl).toHaveBeenCalled()
      })
    })

    it('Should invoke a parent controller when a child is navigated to', () => {
      return router.go('home.child').then(() => {
        expect(homeCtrl).toHaveBeenCalled()
        expect(childCtrl).toHaveBeenCalled()
      })
    })

    it('Should not invoke parent controller a second time when navigating to child.', () => {
      return router.go('home')
        .then(() => router.go('home.child'))
        .then(() => {
          expect(childCtrl).toHaveBeenCalled()
          expect(homeCtrl.mock.calls.length).toBe(1)
        })
    })

    it('Should not invoke parent controller a second time when navigating to sibling.', () => {
      return router.go('home.child')
        .then(() => router.go('home.sibling'))
        .then(() => {
          expect(homeCtrl.mock.calls.length).toBe(1)
          expect(childCtrl.mock.calls.length).toBe(1)
          expect(siblingCtrl.mock.calls.length).toBe(1)
        })
    })

    // @TODO
    it('Should not invoke parent controller a second time when go is called synchronously.', () => {
      router.go('home')

      return router.go('home.child')
        .then(() => {
          expect(homeCtrl.mock.calls.length).toBe(1)
          expect(childCtrl.mock.calls.length).toBe(1)
        })
    })

    it('Should invoke parent controller a second time', () => {
      return router.go('home.child')
        .then(() => router.go('foo', { fooId: 1 }))
        .then(() => router.go('home.child.grandChild'))
        .then(() => {
          expect(fooCtrl.mock.calls.length).toBe(1)
          expect(homeCtrl.mock.calls.length).toBe(2)
          expect(childCtrl.mock.calls.length).toBe(2)
          expect(grandChildCtrl.mock.calls.length).toBe(1)
        })
    })

    it('Should exit and enter the correct paths.', () => {
      router.go('home.child.grandChild')

      // @TODO: expect exit handlers to be called
      router.go('foo', { fooId: 1 })
    })

    it('Should throw an error when route not found.', () => {
      expect(() => router.go('wat')).toThrow(new Error("Route 'wat' not found."))
    })

    describe('With resolve:', () => {
      let controller, deferred, router;

      beforeEach(() => {
        controller = vi.fn()
        deferred = defer()
        router = new Router()

        router.route('foo', {
          controller: controller,
          resolve: () => {
            return deferred.promise
          }
        })
      })

      it('Should invoke the controller after promise resolution.', () => {
        let promise = router.go('foo')

        expect(controller).not.toHaveBeenCalled()

        deferred.resolve('bar')

        return promise.then(() => {
          expect(controller).toHaveBeenCalled()
        })
      })

      it('Should not invoke the controller after promise rejection.', () => {
        deferred.reject('bar')

        return router.go('foo').catch(() => {
          expect(controller).not.toHaveBeenCalled()
        })
      })

      it('Should not invoke a child route if parent resolve was rejected.', () => {
        let controller = vi.fn()

        router.route('foo.bar', {
          parent: 'foo',
          controller: controller
        })

        deferred.reject('rejected')

        return router.go('foo.bar').catch(() => {
          expect(controller).not.toHaveBeenCalled()
        })
      })
    })
  })

  describe('href(name, params):', () => {
    it('Should return the URL for a route with params.', () => {
      let href = router.href('foo', { fooId: 1 })

      expect(href).toBe('#!/foo/1')
    })

    it('Should inherit current params.', () => {
      return router.go('foo', { fooId: 1}).then(() => {
        let href = router.href('foo.baz', { bazId: 2 })

        expect(href).toBe('#!/foo/1/baz/2')
      })
    })

    it('Should return the correct URL for a child route with no URL.', () => {
      router.route('biz', {
        parent: 'foo'
      })

      let href = router.href('biz', { fooId: 1 })

      expect(href).toBe('#!/foo/1')
    })
  })

  describe('transitionTo(route, params):', () => {
    let foo, bar, baz;

    beforeEach(() => {
      foo = router.registry.get('foo')
      bar = router.registry.get('foo.bar')
      baz = router.registry.get('foo.baz')
    })

    it('Should instantiate controller with params.', () => {
      let foo = router.registry.get('foo')

      return router.transitionTo(foo, { 'fooId': 1}).then(() => {
        let [params, resolve] = fooCtrl.mock.calls[fooCtrl.mock.calls.length - 1]

        expect(params).toEqual({
          'fooId': 1
        })

        expect(resolve).toEqual({})
      })
    })

    it('Should update current with params.', () => {
      vi.spyOn(router.current, 'put')

      return router.transitionTo(foo, { 'fooId': 1}).then(() => {
        expect(router.current.put).toHaveBeenCalledWith(foo,
          expect.objectContaining({ fooId: 1 }))
      })
    })

    it('Should instantiate controller with params and resolve.', () => {
      let baz = router.registry.get('foo.baz')

      bazDeferred.resolve('Baz')

      return router.transitionTo(baz, { 'fooId': 1}).then(() => {
        let [params, resolve] = bazCtrl.mock.calls[bazCtrl.mock.calls.length - 1]

        expect(params).toEqual({
          'fooId': 1
        })

        expect(resolve).toEqual('Baz')
      })
    })

    it('Should update URL with correct params.', () => {
      vi.spyOn(router, 'pushState')

      return router.transitionTo(bar, { fooId: 1, barId: 2}, {
        location: true
      }).then(() => {
        expect(router.pushState).toHaveBeenCalled()

        expect(router.pushState).toHaveBeenCalledWith(
          expect.any(Object),
          'Bar',
          '#!/foo/1/bar/2'
        )
      })
    })

    it('Should update URL without query arg when arg is null.', () => {
      vi.spyOn(router, 'pushState')

      return router.go('foo.biz', { fooId: 2 }).then(() => {
        expect(router.pushState).toHaveBeenCalledWith(
          expect.any(Object),
          'Biz',
          '#!/foo/2/biz'
        )
      })
    })

    it('Should update URL with query arg when arg is defined.', () => {
      vi.spyOn(router, 'pushState')

      return router.go('foo.biz', { fooId: 2, bizId: 3 }).then(() => {
        expect(router.pushState).toHaveBeenCalledWith(
          expect.any(Object),
          'Biz',
          '#!/foo/2/biz?bizId=3'
        )
      })
    })

    it('Should inherit params.', () => {
      vi.spyOn(router, 'pushState')

      return router.transitionTo(foo, { fooId: 1 })
        .then(() => router.transitionTo(bar, { barId: 2 }, { location: true }))
        .then(() => {
          expect(router.pushState).toHaveBeenCalledWith(
            expect.any(Object),
            'Bar',
            '#!/foo/1/bar/2'
          )
        })
    })

    it('Should exit and re-enter if route is the same.', () => {
      vi.spyOn(foo, 'exit')

      return router.transitionTo(foo, { fooId: 1 })
        .then(() => router.transitionTo(foo))
        .then(() => {
          expect(foo.exit).toHaveBeenCalled()
          expect(fooCtrl.mock.calls.length).toBe(2)
        })
    })

    it('Should return a promise resolved on transition success.', () => {
      let onSuccess = vi.fn()
      let onError = vi.fn()

      bazDeferred.reject('O SNAPS')

      return router.transitionTo(baz)
        .then(onSuccess)
        .catch(onError)
        .then((result) => {
          expect(onSuccess).not.toHaveBeenCalled()
          expect(onError).toHaveBeenCalled()
        })
    })

    it('Should return a promise rejected on transition failure.', () => {
      let onSuccess = vi.fn().mockImplementation((result) => result)

      let onError = vi.fn()

      bazDeferred.resolve('Weeee')

      return router.transitionTo(baz)
        .then(onSuccess)
        .catch(onError)
        .then((result) => {
          expect(onSuccess).toHaveBeenCalled()
          expect(onError).not.toHaveBeenCalled()
        })
    })

    it('Should exit and re-enter parent route when parent route param changes.', () => {
      vi.spyOn(foo, 'exit')

      return router.transitionTo(foo, {
        fooId: '1'
      })
      .then(() => router.transitionTo(bar, { fooId: '2', barId: '3' }))
      .then(() => {
        expect(foo.exit).toHaveBeenCalled()
        expect(fooCtrl.mock.calls.length).toBe(2)
      })
    })

    describe('With Exit Handlers:', () => {
      let deferred, onExit;

      class Controller {
        onExit() {}
      }

      beforeEach(() => {
        deferred = defer()

        onExit = vi.spyOn(Controller.prototype, 'onExit').mockReturnValue(deferred.promise)

        router.route('gizmo', {
          controller: Controller
        })
      })

      it("Should call controller's exit handler when exiting a route.", () => {
        deferred.resolve('onExit')

        return router.go('gizmo')
          .then(() => router.go('home'))
          .then(() => {
            expect(onExit).toHaveBeenCalled()
          })
      })

      it('Should continue to its destination when exit handler resolves.', () => {
        deferred.resolve('onExit')

        return router.go('gizmo')
          .then(() => router.go('home'))
          .then(() => {
            expect(onExit).toHaveBeenCalled()
            expect(homeCtrl).toHaveBeenCalled()
          })
      })

      it('Should not change routes when exit handler is rejected.', () => {
        deferred.reject('onExit')

        return router.go('gizmo')
          .then(() => router.go('home'), () => {})
          .catch(() => {
            expect(onExit).toHaveBeenCalled()
            expect(homeCtrl).not.toHaveBeenCalled()
          })
      })
    })
  })

  describe('on hash change:', () => {
    beforeEach(() => {
      vi.spyOn(router, 'transitionTo')
    })

    it('Should go to the correct route.', () => {
      router.urlRouter.onChange('#!/home')

      expect(router.transitionTo).toHaveBeenCalledWith(
        router.registry.get('home'),
        expect.any(Object)
      )
    })

    it('Should go to the correct child route.', () => {
      router.urlRouter.onChange('#!/home/child')

      expect(router.transitionTo).toHaveBeenCalledWith(
        router.registry.get('home.child'),
        expect.any(Object)
      )
    })

    it('Should go to the correct grand child route.', () => {
      router.urlRouter.onChange('#!/home/child/grandChild')

      expect(router.transitionTo).toHaveBeenCalledWith(
        router.registry.get('home.child.grandChild'),
        expect.any(Object)
      )
    })

    it('Should go to the correct route with param.', () => {
      router.urlRouter.onChange('#!/foo/1')

      expect(router.transitionTo).toHaveBeenCalledWith(
        router.registry.get('foo'),
        expect.objectContaining({
          fooId: '1',
        })
      )

      expect(router.transitionTo.mock.calls[router.transitionTo.mock.calls.length - 1][1]).toEqual({
        fooId: '1'
      })
    })

    it('Should go to the correct child route with parent param.', () => {
      router.urlRouter.onChange('#!/foo/1/bar/2')

      expect(router.transitionTo).toHaveBeenCalledWith(
        router.registry.get('foo.bar'),
        expect.objectContaining({
          fooId: '1',
          barId: '2',
        })
      )

      expect(router.transitionTo.mock.calls[router.transitionTo.mock.calls.length - 1][1]).toEqual({
        fooId: '1',
        barId: '2',
      })
    })

    it('Should go to the correct child route with param, parent param, and resolve.', () => {
      router.urlRouter.onChange('#!/foo/1/baz/2')

      expect(router.transitionTo).toHaveBeenCalledWith(
        router.registry.get('foo.baz'),
        expect.objectContaining({
          fooId: '1',
          bazId: '2',
        })
      )
    })

    it('Should log a warning if param is missing.', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      router.urlRouter.onChange('#!/foo/')

      expect(console.warn).toHaveBeenCalledWith(
        "No route handler found for '/foo/'"
      )
    })
  })
})
