import { describe, it, expect, beforeEach } from 'vitest'
import Router from '../../Router'
import Transition from '../Transition'

const transitionsMock = {
  onStartHandlers: []
}

// Returns the path by route name
function getNamePath(path) {
  return path.map((route) => route.name)
}

describe('Transition:', () => {
  let router;

  beforeEach(() => {
    router = new Router()

    router.route('foo', { url: '/foo/:fooId' })
      .route('foo.bar', { url: '/bar/:barId' })
      .route('foo.bar.bat')
      .route('biz')
      .route('biz.bar')
  })

  it('Should have the correct exit path and an enter path.', () => {
    let current = router.registry.get('foo.bar.bat')
    let target = router.registry.get('biz.bar')

    let transition = new Transition(transitionsMock, current, target)

    expect(getNamePath(transition.exitPath))
      .toEqual(['foo.bar.bat', 'foo.bar', 'foo'])

    expect(getNamePath(transition.enterPath))
      .toEqual(['biz', 'biz.bar'])
  })

  describe('With ancestor param change:', () => {
    let transition;

    beforeEach(() => {
      let current = router.registry.get('foo.bar')
      let target = router.registry.get('foo.bar.bat')

      transition = new Transition(transitionsMock, current, target, {
        fooId: 1
      }, {
        fooId: 2
      })
    })

    it('Should have the correct exit path.', () => {
      let exitPath = getNamePath(transition.exitPath)

      expect(exitPath).toEqual(['foo.bar', 'foo'])
    })

    it('Should have the correct enter path.', () => {
      let enterPath = getNamePath(transition.enterPath)

      expect(enterPath).toEqual(['foo', 'foo.bar', 'foo.bar.bat'])
    })
  })

  describe('With parent param change:', () => {
    let transition;

    beforeEach(() => {
      let foo = router.registry.get('foo')
      let bar = router.registry.get('foo.bar')

      transition = new Transition(transitionsMock, foo, bar, {
        fooId: 1
      }, {
        fooId: 2,
        barId: 3
      })
    })

    it('Should have the correct exit path.', () => {
      let exitPath = getNamePath(transition.exitPath)

      expect(exitPath).toEqual(['foo'])
    })

    it('Should have the correct enter path.', () => {
      let enterPath = getNamePath(transition.enterPath)

      expect(enterPath).toEqual(['foo', 'foo.bar'])
    })
  })

  describe('When target route is the same as current:', () => {
    let transition;

    beforeEach(() => {
      let foo = router.registry.get('foo')

      transition = new Transition(transitionsMock, foo, foo)
    })

    it('Should have the correct exit path.', () => {
      let exitPath = getNamePath(transition.exitPath)

      expect(exitPath).toEqual(['foo'])
    })

    it('Should have the correct enter path.', () => {
      let exitPath = getNamePath(transition.exitPath)

      expect(exitPath).toEqual(['foo'])
    })

    describe('With changed parent param:', () => {
      beforeEach(() => {
        let bat = router.registry.get('foo.bar.bat')

        transition = new Transition(transitionsMock, bat, bat, {
          fooId: 1
        }, {
          fooId: 2
        })
      })

      it('Should have the correct exit path.', () => {
        let exitPath = getNamePath(transition.exitPath)

        expect(exitPath).toEqual(['foo.bar.bat', 'foo.bar', 'foo'])
      })

      it('Should have the correct enter path.', () => {
        let enterPath = getNamePath(transition.enterPath)

        expect(enterPath).toEqual(['foo', 'foo.bar', 'foo.bar.bat'])
      })
    })
  })
})
